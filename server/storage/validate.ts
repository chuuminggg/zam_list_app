import { SEARCH_PROVIDER_IDS, STOCK_PROVIDER_IDS } from '../../shared/api.js';
import type { CollectionId, CollectionItem, Todo, WishItem } from '../../shared/data.js';
import { ApiException } from '../errors.js';

/**
 * 클라이언트가 보낸 항목을 검증하고, 알려진 필드만 골라 새 객체로 만든다.
 * 형식이 틀리면 ApiException(BAD_REQUEST)을 던진다.
 */

type Obj = Record<string, unknown>;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function invalid(field: string): never {
  throw new ApiException('BAD_REQUEST', `항목의 '${field}' 값이 올바르지 않습니다.`);
}

function asObject(value: unknown, field: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(field);
  return value as Obj;
}

function str(obj: Obj, field: string, max: number, min = 0): string {
  const value = obj[field];
  if (typeof value !== 'string' || value.length < min || value.length > max) invalid(field);
  return value;
}

function optStr(obj: Obj, field: string, max: number): string | undefined {
  return obj[field] == null || obj[field] === '' ? undefined : str(obj, field, max);
}

function oneOf<T extends string>(obj: Obj, field: string, allowed: readonly T[]): T {
  const value = obj[field];
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) invalid(field);
  return value as T;
}

function id(obj: Obj): string {
  const value = str(obj, 'id', 64);
  if (!ID_PATTERN.test(value)) invalid('id');
  return value;
}

/** undefined 필드를 빼서 저장 용량과 비교 노이즈를 줄인다. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function parseTodo(value: unknown): Todo {
  const obj = asObject(value, 'todo');
  if (typeof obj.done !== 'boolean') invalid('done');
  return {
    id: id(obj),
    title: str(obj, 'title', 500, 1),
    done: obj.done,
    priority: oneOf(obj, 'priority', ['high', 'medium', 'low'] as const),
    category: str(obj, 'category', 50),
    createdAt: str(obj, 'createdAt', 40, 1),
  };
}

export function parseWishItem(value: unknown): WishItem {
  const obj = asObject(value, 'wish');
  const price = obj.price;
  if (price != null && (typeof price !== 'number' || !Number.isFinite(price) || price < 0)) invalid('price');

  let source: WishItem['source'];
  if (obj.source != null) {
    const s = asObject(obj.source, 'source');
    source = { provider: oneOf(s, 'provider', SEARCH_PROVIDER_IDS), externalId: str(s, 'externalId', 100, 1) };
  }

  let stockLink: WishItem['stockLink'];
  if (obj.stockLink != null) {
    const s = asObject(obj.stockLink, 'stockLink');
    stockLink = {
      provider: oneOf(s, 'provider', STOCK_PROVIDER_IDS),
      productId: str(s, 'productId', 100, 1),
      productName: str(s, 'productName', 300),
    };
  }

  return compact({
    id: id(obj),
    name: str(obj, 'name', 300, 1),
    url: optStr(obj, 'url', 2000),
    price: price == null ? undefined : (price as number),
    memo: optStr(obj, 'memo', 2000),
    imageUrl: optStr(obj, 'imageUrl', 2000),
    status: oneOf(obj, 'status', ['want', 'bought', 'dropped'] as const),
    category: str(obj, 'category', 50),
    createdAt: str(obj, 'createdAt', 40, 1),
    source,
    stockLink,
  });
}

export const PARSERS: { [C in CollectionId]: (value: unknown) => CollectionItem[C] } = {
  todos: parseTodo,
  wishlist: parseWishItem,
};

/** `{ items: [...] }` 요청 본문을 검증한다. 같은 id가 여러 번 오면 마지막 것을 쓴다. */
export function parseItems<C extends CollectionId>(collection: C, body: unknown, max: number): CollectionItem[C][] {
  const items = asObject(body, 'body').items;
  if (!Array.isArray(items)) invalid('items');
  if (items.length > max) {
    throw new ApiException('BAD_REQUEST', `한 번에 최대 ${max}개까지 저장할 수 있습니다.`);
  }
  const parse = PARSERS[collection];
  const byId = new Map(items.map((item) => {
    const parsed = parse(item);
    return [parsed.id, parsed] as const;
  }));
  return [...byId.values()];
}
