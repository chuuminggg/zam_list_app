/**
 * 오늘의집 어댑터. 키워드 검색 없이 공개 "오늘의딜" 페이지의 특가 목록만 읽는다.
 *
 * 페이지 HTML에 서버 렌더링된 Next.js `__NEXT_DATA__`(React Query dehydratedState)에서
 * `today-deal-feed`·`special-today-deal-feed` 두 쿼리의 slots만 읽는다.
 * 앞단 Akamai가 익명·브라우저 흉내 UA는 403으로 막고, 앱 이름과 연락처가 든 UA는 통과시키므로
 * 우회하지 않고 정직한 UA로 요청한다.
 */
import type { ProductResult } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { fetchText } from '../http.js';

const LABEL = '오늘의집';
const DEALS_URL = 'https://store.ohou.se/today_deals';
const PRODUCT_PAGE = 'https://ohou.se/productions/';
const USER_AGENT = 'zam-list-app/1.0 (+https://github.com/chuuminggg/zam_list_app)';
const FEED_KEYS = new Set(['today-deal-feed', 'special-today-deal-feed']);

interface RawPrice {
  originalPrice?: string;
  sellingPrice?: string;
  representativeOriginalPrice?: string;
  representativeSellingPrice?: string;
  discountRate?: string;
}

/** 슬롯의 deal(묶음 특가)·goods(단일 상품) 공통 필드 */
interface RawItem {
  id?: string;
  name?: string;
  imageUrl?: string;
  isSoldOut?: boolean;
  brand?: { name?: string };
  price?: RawPrice;
  badgeProperties?: { isFreeDelivery?: boolean };
  reviewStatistic?: { reviewCount?: number; reviewAverage?: number };
}

interface RawSlot {
  type?: string;
  endAt?: string;
  deal?: RawItem;
  goods?: RawItem;
  bestDiscountPrice?: { price?: string; discountRate?: string; discountPlanDescription?: string };
}

interface RawNextData {
  props?: {
    pageProps?: {
      dehydratedState?: {
        queries?: { queryKey?: unknown[]; state?: { data?: { todayDealFeed?: { slots?: RawSlot[] } } } }[];
      };
    };
  };
}

const toNumber = (value?: string): number | undefined => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isNaN(n) ? undefined : n;
};

export function extractNextData(html: string): RawNextData {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new ApiException('PARSE_ERROR', '오늘의집 페이지 형식이 바뀌었습니다.');
  try {
    return JSON.parse(match[1]) as RawNextData;
  } catch {
    throw new ApiException('PARSE_ERROR', '오늘의집 페이지 데이터를 해석할 수 없습니다.');
  }
}

function toResult(slot: RawSlot): ProductResult | undefined {
  const item = slot.type === 'DEAL' ? slot.deal : slot.type === 'GOODS' ? slot.goods : undefined;
  if (!item?.id || !item.name) return undefined;

  const price = item.price ?? {};
  const selling = toNumber(price.sellingPrice ?? price.representativeSellingPrice);
  const discountRate = toNumber(price.discountRate);
  const best = slot.bestDiscountPrice;
  const bestPrice = toNumber(best?.price);

  const badges: string[] = [];
  if (discountRate) badges.push(`${discountRate}% 할인`);
  if (bestPrice != null && selling != null && bestPrice < selling) {
    badges.push(`${best?.discountPlanDescription ?? '최대 혜택가'} ${bestPrice.toLocaleString('ko-KR')}원`);
  }
  if (item.badgeProperties?.isFreeDelivery) badges.push('무료배송');
  const review = item.reviewStatistic;
  if (review?.reviewCount) {
    badges.push(`★${review.reviewAverage ?? '-'} (${review.reviewCount.toLocaleString('ko-KR')})`);
  }
  if (item.isSoldOut) badges.push('품절');

  const brand = item.brand?.name?.trim();
  return {
    provider: 'ohou',
    externalId: item.id,
    name: brand && !item.name.includes(brand) ? `[${brand}] ${item.name}` : item.name,
    price: selling,
    url: `${PRODUCT_PAGE}${encodeURIComponent(item.id)}/selling`,
    imageUrl: item.imageUrl,
    soldOut: Boolean(item.isSoldOut),
    badges,
  };
}

/** 오늘의딜 페이지 데이터에서 특가 상품 목록을 뽑는다. 스페셜딜이 먼저 오고, 중복 상품은 한 번만. */
export function parseOhouDeals(data: RawNextData): ProductResult[] {
  const queries = data.props?.pageProps?.dehydratedState?.queries;
  if (!queries) throw new ApiException('PARSE_ERROR', '오늘의집 페이지 형식이 바뀌었습니다.');

  const feeds = queries
    .filter((q) => FEED_KEYS.has(String(q.queryKey?.[0])))
    // special-today-deal-feed(스페셜딜)를 먼저 보여준다.
    .sort((a, b) => Number(b.queryKey?.[0] === 'special-today-deal-feed') - Number(a.queryKey?.[0] === 'special-today-deal-feed'));

  const seen = new Set<string>();
  const results: ProductResult[] = [];
  for (const feed of feeds) {
    for (const slot of feed.state?.data?.todayDealFeed?.slots ?? []) {
      const result = toResult(slot);
      if (!result || seen.has(result.externalId)) continue;
      seen.add(result.externalId);
      results.push(result);
    }
  }
  return results;
}

export async function fetchOhouDeals(): Promise<ProductResult[]> {
  const html = await fetchText(DEALS_URL, {
    label: LABEL,
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });
  return parseOhouDeals(extractNextData(html));
}
