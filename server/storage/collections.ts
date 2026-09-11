import { createHash } from 'node:crypto';
import {
  MAX_ITEMS_PER_COLLECTION,
  SYNC_KEY_PATTERN,
  type CollectionId,
  type CollectionItem,
} from '../../shared/data.js';
import { ApiException } from '../errors.js';
import { getRedisConfig, Redis } from './redis.js';
import { PARSERS } from './validate.js';

/** 요청 헤더의 동기화 키를 검증한다. 키 원문은 저장하지 않고 해시만 Redis 키에 쓴다. */
export function requireSyncKey(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!SYNC_KEY_PATTERN.test(key)) {
    throw new ApiException('UNAUTHORIZED', '동기화 키가 없거나 형식이 올바르지 않습니다.');
  }
  return key;
}

export function requireRedis(env: NodeJS.ProcessEnv = process.env): Redis {
  const config = getRedisConfig(env);
  if (!config) {
    throw new ApiException(
      'NOT_CONFIGURED',
      '서버 저장소가 설정되지 않았습니다. (환경변수 필요: KV_REST_API_URL, KV_REST_API_TOKEN)',
    );
  }
  return new Redis(config);
}

/**
 * 사용자 컬렉션 저장소. Redis 해시 하나에 `id → 항목 JSON`으로 저장한다.
 * 키: `zam:v1:<sha256(syncKey)>:<collection>`
 */
export class CollectionRepository<C extends CollectionId> {
  private readonly redis: Redis;
  private readonly collection: C;
  private readonly key: string;

  constructor(redis: Redis, syncKey: string, collection: C) {
    this.redis = redis;
    this.collection = collection;
    const owner = createHash('sha256').update(syncKey).digest('hex');
    this.key = `zam:v1:${owner}:${collection}`;
  }

  /** 전체 항목 (createdAt 오름차순) */
  async list(): Promise<CollectionItem[C][]> {
    const flat = (await this.redis.exec<string[] | null>(['HGETALL', this.key])) ?? [];
    const parse = PARSERS[this.collection];
    const items: CollectionItem[C][] = [];
    for (let i = 1; i < flat.length; i += 2) {
      try {
        items.push(parse(JSON.parse(flat[i])));
      } catch {
        // 스키마가 바뀌어 읽을 수 없는 항목은 건너뛴다.
        console.error(`[collections] ${this.collection} 항목 파싱 실패: ${flat[i - 1]}`);
      }
    }
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** 항목 추가/수정 */
  async upsert(items: CollectionItem[C][]): Promise<void> {
    if (items.length === 0) return;
    const ids = items.map((item) => item.id);
    const [size, existing] = (await this.redis.pipeline([
      ['HLEN', this.key],
      ['HMGET', this.key, ...ids],
    ])) as [number, (string | null)[]];
    const added = existing.filter((value) => value === null).length;
    if (size + added > MAX_ITEMS_PER_COLLECTION) {
      throw new ApiException('BAD_REQUEST', `최대 ${MAX_ITEMS_PER_COLLECTION}개까지 저장할 수 있습니다.`);
    }
    await this.redis.exec(['HSET', this.key, ...this.fields(items)]);
  }

  /** 컬렉션 전체를 주어진 항목으로 교체 */
  async replace(items: CollectionItem[C][]): Promise<void> {
    const commands: (string | number)[][] = [['DEL', this.key]];
    if (items.length > 0) commands.push(['HSET', this.key, ...this.fields(items)]);
    await this.redis.transaction(commands);
  }

  async remove(id: string): Promise<void> {
    await this.redis.exec(['HDEL', this.key, id]);
  }

  private fields(items: CollectionItem[C][]): string[] {
    return items.flatMap((item) => [item.id, JSON.stringify(item)]);
  }
}
