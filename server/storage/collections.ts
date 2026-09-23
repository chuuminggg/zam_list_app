import { MAX_ITEMS_PER_COLLECTION, type CollectionId, type CollectionItem } from '../../shared/data.js';
import { ApiException } from '../errors.js';
import type { Db, Statement } from './db.js';
import { PARSERS } from './validate.js';

/**
 * 사용자 컬렉션 저장소. items 테이블에 (user_id, collection, id) → 항목 JSON으로 저장한다.
 */
export class CollectionRepository<C extends CollectionId> {
  private readonly db: Db;
  private readonly userId: string;
  private readonly collection: C;

  constructor(db: Db, userId: string, collection: C) {
    this.db = db;
    this.userId = userId;
    this.collection = collection;
  }

  /** 전체 항목 (createdAt 오름차순) */
  async list(): Promise<CollectionItem[C][]> {
    const rows = await this.db.query<{ id: string; data: unknown }>(
      'SELECT id, data FROM items WHERE user_id = $1 AND collection = $2 ORDER BY created_at, id',
      [this.userId, this.collection],
    );
    const parse = PARSERS[this.collection];
    const items: CollectionItem[C][] = [];
    for (const row of rows) {
      try {
        items.push(parse(row.data));
      } catch {
        // 스키마가 바뀌어 읽을 수 없는 항목은 건너뛴다.
        console.error(`[collections] ${this.collection} 항목 파싱 실패: ${row.id}`);
      }
    }
    return items;
  }

  /** 항목 추가/수정 */
  async upsert(items: CollectionItem[C][]): Promise<void> {
    if (items.length === 0) return;
    const [{ size, existing }] = await this.db.query<{ size: number; existing: number }>(
      `SELECT count(*)::int AS size, count(*) FILTER (WHERE id = ANY($3::text[]))::int AS existing
       FROM items WHERE user_id = $1 AND collection = $2`,
      [this.userId, this.collection, items.map((item) => item.id)],
    );
    if (size + items.length - existing > MAX_ITEMS_PER_COLLECTION) {
      throw new ApiException('BAD_REQUEST', `최대 ${MAX_ITEMS_PER_COLLECTION}개까지 저장할 수 있습니다.`);
    }
    await this.db.transaction([this.insert(items)]);
  }

  /** 컬렉션 전체를 주어진 항목으로 교체 */
  async replace(items: CollectionItem[C][]): Promise<void> {
    const statements: Statement[] = [
      { text: 'DELETE FROM items WHERE user_id = $1 AND collection = $2', params: [this.userId, this.collection] },
    ];
    if (items.length > 0) statements.push(this.insert(items));
    await this.db.transaction(statements);
  }

  async remove(id: string): Promise<void> {
    await this.db.query('DELETE FROM items WHERE user_id = $1 AND collection = $2 AND id = $3', [
      this.userId,
      this.collection,
      id,
    ]);
  }

  /** 항목 배열을 JSON 하나로 넘겨 한 문장으로 넣는다. */
  private insert(items: CollectionItem[C][]): Statement {
    return {
      text: `INSERT INTO items (user_id, collection, id, data, created_at)
             SELECT $1, $2, x->>'id', x, x->>'createdAt' FROM jsonb_array_elements($3::jsonb) AS x
             ON CONFLICT (user_id, collection, id)
             DO UPDATE SET data = EXCLUDED.data, created_at = EXCLUDED.created_at, updated_at = now()`,
      params: [this.userId, this.collection, JSON.stringify(items)],
    };
  }
}
