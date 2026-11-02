/**
 * 올리브영 오특(오늘의 특가) 어댑터.
 * 올리브영은 서버(Node)에서 보내는 요청을 Cloudflare로 막으므로, 재고 조회처럼 daiso-mcp 호스팅 서버를 경유한다.
 * 오특은 REST 경로가 없어 MCP 도구 get_catalog(service=oliveyoung, operation=today_deals)를
 * 루트 POST(stateless 단축 경로)로 부르고, SSE로 오는 JSON-RPC 응답의 structuredContent를 읽는다.
 */
import type { TodayDeal, TodayDeals } from '../../shared/todayDeals.js';
import { cached } from '../cache/cache.js';
import { ApiException } from '../errors.js';
import { fetchText } from '../http.js';

const MCP_URL = 'https://mcp.aka.page/';
const LABEL = '올리브영';
/** 호스팅 서버가 무료 릴레이로 여러 페이지를 합치면 길게는 60초까지 걸린다. */
const TIMEOUT_MS = 55000;
/** 하루 동안 목록이 거의 바뀌지 않고 호스팅 서버에 IP별 일일 호출 한도가 있어 길게 둔다. */
const CACHE_SECONDS = 1800;
const PRODUCT_PAGE = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=';

interface JsonRpcMessage {
  result?: { isError?: boolean; structuredContent?: unknown; content?: { type?: string; text?: string }[] };
  error?: { message?: string };
}

const str = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value : undefined);
const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** 원본 링크는 https만 남긴다 (javascript: 같은 주소가 href·src로 들어가지 않게). */
function httpsUrl(value: unknown): string | undefined {
  const raw = str(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function toDeal(raw: unknown): TodayDeal | null {
  if (!raw || typeof raw !== 'object') return null;
  const deal = raw as Record<string, unknown>;
  const goodsNo = str(deal.goodsNo);
  const name = str(deal.name);
  const price = num(deal.price);
  if (!goodsNo || !name || price === undefined) return null;
  return {
    rank: num(deal.rank) ?? 0,
    goodsNo,
    name,
    brand: str(deal.brand),
    price,
    priceFrom: deal.priceFrom === true,
    originalPrice: num(deal.originalPrice),
    discountRate: num(deal.discountRate),
    flags: Array.isArray(deal.flags) ? deal.flags.filter((f): f is string => typeof f === 'string') : [],
    soldOut: deal.soldOut === true,
    imageUrl: httpsUrl(deal.imageUrl),
    productUrl: httpsUrl(deal.productUrl) ?? `${PRODUCT_PAGE}${encodeURIComponent(goodsNo)}`,
  };
}

const toDeals = (raw: unknown): TodayDeal[] => (Array.isArray(raw) ? raw.map(toDeal).filter((d) => d !== null) : []);

/** SSE 본문(`event: message` / `data: {...}`)에서 JSON-RPC 메시지를 꺼낸다. 일반 JSON 본문도 받는다. */
export function parseMcpResponse(body: string): JsonRpcMessage {
  const data = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('');
  try {
    return JSON.parse(data || body) as JsonRpcMessage;
  } catch {
    throw new ApiException('PARSE_ERROR', `${LABEL} 오특 응답을 해석할 수 없습니다.`);
  }
}

export function parseTodayDeals(message: JsonRpcMessage): TodayDeals {
  const { result } = message;
  if (message.error || !result || result.isError) {
    // 원본 차단·형식 변경은 호스팅 서버가 빈 목록이 아니라 오류로 돌려준다.
    const reason = message.error?.message ?? result?.content?.find((c) => c.type === 'text')?.text ?? 'UNKNOWN';
    throw new ApiException('UPSTREAM_ERROR', `${LABEL} 오특 조회에 실패했습니다. (${reason.slice(0, 120)})`);
  }
  const content = (result.structuredContent ?? {}) as Record<string, unknown>;
  const date = str(content.date);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(content.todayDeals)) {
    throw new ApiException('PARSE_ERROR', `${LABEL} 오특 응답 형식이 바뀌었습니다.`);
  }
  return { date, brandDeals: toDeals(content.brandDeals), todayDeals: toDeals(content.todayDeals) };
}

export async function fetchOliveyoungTodayDeals(): Promise<TodayDeals> {
  const body = await fetchText(MCP_URL, {
    method: 'POST',
    label: LABEL,
    timeoutMs: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_catalog', arguments: { service: 'oliveyoung', operation: 'today_deals' } },
    }),
  });
  return parseTodayDeals(parseMcpResponse(body));
}

/** 한국 시간 기준 오늘 날짜. 자정에 오특이 바뀌므로 캐시 키에 넣어 전날 목록을 내주지 않는다. */
export const kstDate = (now = new Date()) => new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

/** 오늘 오특 (캐시 우선) */
export const getOliveyoungTodayDeals = (): Promise<TodayDeals> =>
  cached(`oliveyoung-today-deals:${kstDate()}`, CACHE_SECONDS, fetchOliveyoungTodayDeals);
