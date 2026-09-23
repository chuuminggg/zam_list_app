import { ApiException } from '../errors.js';

type Command = (string | number)[];
type Reply = { result?: unknown; error?: string };

export interface RedisConfig {
  url: string;
  token: string;
}

/**
 * Upstash Redis 접속 정보. Vercel Marketplace 연동은 KV_REST_API_*,
 * Upstash 콘솔에서 직접 만든 DB는 UPSTASH_REDIS_REST_* 이름으로 주입된다.
 */
export function getRedisConfig(env: NodeJS.ProcessEnv = process.env): RedisConfig | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

/** Upstash REST API로 명령을 보내는 최소 클라이언트. */
export class Redis {
  private readonly config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
  }

  /** 명령 하나 실행 */
  async exec<T>(command: Command): Promise<T> {
    const reply = await this.post<Reply>('', command);
    return unwrap<T>(reply);
  }

  /** 여러 명령을 한 번에 보낸다 (원자적이지 않음) */
  async pipeline(commands: Command[]): Promise<unknown[]> {
    const replies = await this.post<Reply[]>('/pipeline', commands);
    return replies.map((reply) => unwrap(reply));
  }

  /** MULTI/EXEC 트랜잭션으로 원자적으로 실행 */
  async transaction(commands: Command[]): Promise<unknown[]> {
    const replies = await this.post<Reply[]>('/multi-exec', commands);
    return replies.map((reply) => unwrap(reply));
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.config.url}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      console.error('[redis]', error);
      throw new ApiException('UPSTREAM_ERROR', '캐시 서버에 연결할 수 없습니다.');
    }
    if (!response.ok) {
      console.error('[redis]', response.status, await response.text().catch(() => ''));
      throw new ApiException('UPSTREAM_ERROR', `캐시 서버 응답 오류입니다. (${response.status})`);
    }
    return (await response.json()) as T;
  }
}

function unwrap<T>(reply: Reply): T {
  if (reply.error) {
    console.error('[redis]', reply.error);
    throw new ApiException('UPSTREAM_ERROR', '캐시 명령이 실패했습니다.');
  }
  return reply.result as T;
}
