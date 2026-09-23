import { PGlite } from '@electric-sql/pglite';
import type { Db } from './db.js';

/** 테스트용 메모리 Postgres (PGlite)로 만든 Db */
export function createTestDb(): Db & { pg: PGlite } {
  const pg = new PGlite();
  return {
    pg,
    query: async <T>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows,
    transaction: async (statements) => {
      await pg.transaction(async (tx) => {
        for (const s of statements) await tx.query(s.text, s.params ?? []);
      });
    },
  };
}
