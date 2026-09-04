/**
 * 다이소몰 어댑터.
 * 엔드포인트·인증 방식은 daiso-mcp(MIT, github.com/hmmhmmhm/daiso-mcp)와 k-skill daiso-product-search 문서를 참고.
 */
import type { ProductResult, StockResult, StoreResult, StoreStock } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { fetchJson, fetchWithTimeout } from '../http.js';

const API = {
  SEARCH: 'https://prdm.daisomall.co.kr/ssn/search/FindStoreGoods',
  AUTH: 'https://fapi.daisomall.co.kr/auth/request',
  STORES: 'https://fapi.daisomall.co.kr/ms/msg/selStr',
  STORE_STOCK: 'https://fapi.daisomall.co.kr/pd/pdh/selStrPkupStck',
  IMAGE_BASE: 'https://cdn.daisomall.co.kr',
  PRODUCT_PAGE: 'https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo=',
};

const LABEL = '다이소몰';
/** 매장 검색 API가 좌표를 필수로 받는다. 거리 정렬에만 쓰이므로 서울시청 고정. */
const DEFAULT_COORDS = { curLttd: 37.5665, curLitd: 126.978 };
/** 공개 웹 클라이언트에 포함된 고정 키 (daiso-mcp 참고) */
const AUTH_ENC_KEY = 'PRE_AUTH_ENC_KEY';

export const DAISO_STOCK_NOTICE =
  '다이소는 2026-05-05부터 매장별 재고 수량을 공개하지 않아, 수량이 확인되지 않는 매장은 "수량 비공개"로 표시됩니다. 방문 전 매장에 확인하세요.';

// ---- 원본 응답 타입 (사용하는 필드만) ----

interface RawProduct {
  PD_NO: string;
  PDNM?: string;
  EXH_PD_NM?: string;
  PD_PRC?: string;
  ATCH_FILE_URL?: string;
  SOLD_OUT_YN?: string;
  NEW_PD_YN?: string;
  PKUP_OR_PSBL_YN?: string;
}

interface RawSearchResponse {
  resultSet?: { result?: { resultDocuments?: RawProduct[] }[] };
}

interface RawStore {
  strCd: string;
  strNm: string;
  strAddr?: string;
  opngTime?: string;
  clsngTime?: string;
  pkupYn?: string;
}

interface RawStock {
  strCd: string;
  stck?: string;
}

// ---- 파서 (fixture 테스트 대상) ----

function imageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path.replace('//img.daisomall.co.kr', '//cdn.daisomall.co.kr');
  return `${API.IMAGE_BASE}${path}`;
}

export function parseDaisoProducts(body: RawSearchResponse): ProductResult[] {
  const docs = body.resultSet?.result?.[0]?.resultDocuments ?? [];
  return docs.map((doc) => {
    const price = Number.parseInt(doc.PD_PRC ?? '', 10);
    const badges: string[] = [];
    if (doc.NEW_PD_YN === 'Y') badges.push('신상품');
    if (doc.PKUP_OR_PSBL_YN === 'Y') badges.push('매장픽업');
    if (doc.SOLD_OUT_YN === 'Y') badges.push('온라인 품절');
    return {
      provider: 'daiso',
      externalId: doc.PD_NO,
      name: doc.EXH_PD_NM || doc.PDNM || '',
      price: Number.isNaN(price) ? undefined : price,
      url: `${API.PRODUCT_PAGE}${encodeURIComponent(doc.PD_NO)}`,
      imageUrl: imageUrl(doc.ATCH_FILE_URL),
      soldOut: doc.SOLD_OUT_YN === 'Y',
      badges,
    };
  });
}

export function parseDaisoStores(raw: RawStore[]): StoreResult[] {
  return raw.map((s) => ({
    provider: 'daiso',
    storeCode: s.strCd,
    name: s.strNm,
    address: s.strAddr ?? '',
    openTime: s.opngTime || undefined,
    closeTime: s.clsngTime || undefined,
    pickup: s.pkupYn === 'Y',
  }));
}

export function mergeDaisoStock(stores: StoreResult[], stock: RawStock[]): StoreStock[] {
  const quantities = new Map(stock.map((s) => [s.strCd, Number.parseInt(s.stck ?? '', 10) || 0]));
  return stores.map((store) => {
    const quantity = quantities.get(store.storeCode) ?? 0;
    // 수량 비공개 이후 0이 "없음"인지 "비공개"인지 구분할 수 없으므로 0은 unknown으로 둔다.
    if (quantity > 0) return { ...store, status: 'in_stock', label: '재고 있음' };
    return {
      ...store,
      status: 'unknown',
      label: store.pickup ? '픽업 매장 · 수량 비공개' : '수량 비공개',
    };
  });
}

// ---- 호출 ----

async function authHeaders(): Promise<Record<string, string>> {
  const response = await fetchWithTimeout(API.AUTH, { label: LABEL });
  const token = (await response.text()).trim();
  const dmUid = response.headers.get('x-dm-uid')?.trim();
  if (!token || !dmUid) {
    throw new ApiException('PARSE_ERROR', '다이소몰 인증 응답 형식이 바뀌었습니다.');
  }

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(AUTH_ENC_KEY), { name: 'AES-CBC' }, false, [
    'encrypt',
  ]);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, encoder.encode(token));
  const bearer = Buffer.from(iv).toString('base64') + Buffer.from(encrypted).toString('base64');

  return { Authorization: `Bearer ${bearer}`, 'X-DM-UID': dmUid, Cookie: `DM_UID=${dmUid}` };
}

function postJson<T>(url: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  return fetchJson<T>(url, {
    label: LABEL,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

export async function searchDaisoProducts(query: string, limit: number): Promise<ProductResult[]> {
  const url = new URL(API.SEARCH);
  url.searchParams.set('searchTerm', query);
  url.searchParams.set('cntPerPage', String(limit));
  url.searchParams.set('pageNum', '1');
  return parseDaisoProducts(await fetchJson<RawSearchResponse>(url.toString(), { label: LABEL }));
}

async function fetchRawStores(keyword: string): Promise<RawStore[]> {
  const body = await postJson<{ data?: RawStore[] }>(API.STORES, {
    inclusiveStrCd: '',
    keyword,
    ...DEFAULT_COORDS,
  });
  return body.data ?? [];
}

export async function checkDaisoStock(productId: string, storeKeyword: string, limit: number): Promise<StockResult> {
  const stores = parseDaisoStores((await fetchRawStores(storeKeyword)).slice(0, limit));
  const base = { provider: 'daiso' as const, productId, checkedAt: new Date().toISOString(), notice: DAISO_STOCK_NOTICE };
  if (stores.length === 0) return { ...base, stores: [] };

  const stock = await postJson<{ data?: RawStock[] }>(
    API.STORE_STOCK,
    stores.map((s) => ({ pdNo: productId, strCd: s.storeCode })),
    await authHeaders(),
  );
  return { ...base, stores: mergeDaisoStock(stores, stock.data ?? []) };
}
