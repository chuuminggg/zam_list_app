import { neon } from '@neondatabase/serverless';
import { ApiException } from '../errors.js';

export interface Statement {
  text: string;
  params?: unknown[];
}

/** 서버 코드가 쓰는 최소 SQL 인터페이스. 운영은 Neon, 테스트는 PGlite로 구현한다. */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** 여러 문장을 하나의 트랜잭션으로 실행 */
  transaction(statements: Statement[]): Promise<void>;
}

/**
 * 테이블 정의. 첫 요청 때 한 번 실행한다 (IF NOT EXISTS라 여러 번 실행해도 안전).
 * items.data에는 검증을 거친 항목 JSON을 그대로 넣는다.
 */
const SCHEMA: Statement[] = [
  {
    text: `CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      username text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    text: `CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )`,
  },
  {
    text: `CREATE TABLE IF NOT EXISTS items (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      collection text NOT NULL,
      id text NOT NULL,
      data jsonb NOT NULL,
      created_at text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, collection, id)
    )`,
  },
];

const ready = new WeakMap<Db, Promise<void>>();

/** 스키마를 만든 뒤 db를 돌려준다. 실패하면 다음 요청에서 다시 시도한다. */
export async function ensureSchema(db: Db): Promise<Db> {
  let pending = ready.get(db);
  if (!pending) {
    pending = db.transaction(SCHEMA).catch((error) => {
      ready.delete(db);
      throw error;
    });
    ready.set(db, pending);
  }
  await pending;
  return db;
}

/**
 * Postgres 접속 문자열. Vercel Marketplace의 Neon 연동은 DATABASE_URL(과 POSTGRES_URL)을 주입한다.
 */
export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.DATABASE_URL || env.POSTGRES_URL || null;
}

let cached: { url: string; db: Db } | null = null;

function neonDb(url: string): Db {
  const sql = neon(url);
  return {
    query: async <T>(text: string, params: unknown[] = []) => {
      try {
        return (await sql.query(text, params)) as T[];
      } catch (error) {
        console.error('[db]', error);
        throw new ApiException('UPSTREAM_ERROR', '데이터베이스 요청이 실패했습니다.');
      }
    },
    transaction: async (statements) => {
      try {
        await sql.transaction(statements.map((s) => sql.query(s.text, s.params ?? [])));
      } catch (error) {
        console.error('[db]', error);
        throw new ApiException('UPSTREAM_ERROR', '데이터베이스 요청이 실패했습니다.');
      }
    },
  };
}

/** 설정된 데이터베이스. 없으면 NOT_CONFIGURED를 던진다. */
export async function requireDb(env: NodeJS.ProcessEnv = process.env): Promise<Db> {
  const url = getDatabaseUrl(env);
  if (!url) {
    throw new ApiException('NOT_CONFIGURED', '서버 저장소가 설정되지 않았습니다. (환경변수 필요: DATABASE_URL)');
  }
  if (cached?.url !== url) cached = { url, db: neonDb(url) };
  return ensureSchema(cached.db);
}
