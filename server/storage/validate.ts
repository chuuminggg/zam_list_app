import { SEARCH_PROVIDER_IDS, STOCK_PROVIDER_IDS } from '../../shared/api.js';
import {
  MAX_LEDGER_AMOUNT,
  MAX_PRICE_HISTORY,
  type Category,
  type CollectionId,
  type CollectionItem,
  type FixedItem,
  type PricePoint,
  type Todo,
  type Transaction,
  type WishItem,
} from '../../shared/data.js';
import { ApiException } from '../errors.js';

/**
 * 클라이언트가 보낸 항목을 검증하고, 알려진 필드만 골라 새 객체로 만든다.
 * 형식이 틀리면 ApiException(BAD_REQUEST)을 던진다.
 */

type Obj = Record<string, unknown>;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const LEDGER_TYPES = ['income', 'expense'] as const;

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

function optPattern(obj: Obj, field: string, pattern: RegExp): string | undefined {
  const value = optStr(obj, field, 64);
  if (value !== undefined && !pattern.test(value)) invalid(field);
  return value;
}

export function parseTodo(value: unknown): Todo {
  const obj = asObject(value, 'todo');
  if (typeof obj.done !== 'boolean') invalid('done');
  return compact({
    id: id(obj),
    title: str(obj, 'title', 500, 1),
    done: obj.done,
    date: optPattern(obj, 'date', DATE_PATTERN),
    categoryId: optPattern(obj, 'categoryId', ID_PATTERN),
    priority: obj.priority == null ? 'medium' : oneOf(obj, 'priority', ['high', 'medium', 'low'] as const),
    category: optStr(obj, 'category', 50) ?? '',
    createdAt: str(obj, 'createdAt', 40, 1),
  });
}

export function parseCategory(value: unknown): Category {
  const obj = asObject(value, 'category');
  const order = obj.order;
  if (typeof order !== 'number' || !Number.isFinite(order)) invalid('order');
  const color = str(obj, 'color', 7);
  if (!COLOR_PATTERN.test(color)) invalid('color');
  return {
    id: id(obj),
    name: str(obj, 'name', 50, 1),
    color,
    order,
    createdAt: str(obj, 'createdAt', 40, 1),
  };
}

function price(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) invalid(field);
  return value;
}

/** 가격 이력은 최근 MAX_PRICE_HISTORY개만 남긴다. */
function parsePriceHistory(value: unknown): PricePoint[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) invalid('priceHistory');
  const points = value.slice(-MAX_PRICE_HISTORY).map((entry) => {
    const point = asObject(entry, 'priceHistory');
    return { at: str(point, 'at', 40, 1), price: price(point.price, 'priceHistory') };
  });
  return points.length > 0 ? points : undefined;
}

export function parseWishItem(value: unknown): WishItem {
  const obj = asObject(value, 'wish');
  if (obj.price != null) price(obj.price, 'price');
  if (obj.soldOut != null && typeof obj.soldOut !== 'boolean') invalid('soldOut');

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
    price: obj.price == null ? undefined : (obj.price as number),
    memo: optStr(obj, 'memo', 2000),
    imageUrl: optStr(obj, 'imageUrl', 2000),
    status: oneOf(obj, 'status', ['want', 'bought', 'dropped'] as const),
    category: str(obj, 'category', 50),
    createdAt: str(obj, 'createdAt', 40, 1),
    source,
    stockLink,
    soldOut: obj.soldOut == null ? undefined : (obj.soldOut as boolean),
    lastCheckedAt: optStr(obj, 'lastCheckedAt', 40),
    priceHistory: parsePriceHistory(obj.priceHistory),
  });
}

/** 가계부 금액: 1원 이상 정수 */
function amount(obj: Obj): number {
  const value = obj.amount;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > MAX_LEDGER_AMOUNT) {
    invalid('amount');
  }
  return value;
}

function pattern(obj: Obj, field: string, re: RegExp): string {
  const value = str(obj, field, 64);
  if (!re.test(value)) invalid(field);
  return value;
}

export function parseTransaction(value: unknown): Transaction {
  const obj = asObject(value, 'transaction');
  return compact({
    id: id(obj),
    type: oneOf(obj, 'type', LEDGER_TYPES),
    amount: amount(obj),
    category: str(obj, 'category', 30, 1),
    date: pattern(obj, 'date', DATE_PATTERN),
    memo: optStr(obj, 'memo', 500),
    createdAt: str(obj, 'createdAt', 40, 1),
  });
}

export function parseFixedItem(value: unknown): FixedItem {
  const obj = asObject(value, 'fixedItem');
  const day = obj.day;
  if (typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > 31) invalid('day');
  const startMonth = pattern(obj, 'startMonth', MONTH_PATTERN);
  const endMonth = optPattern(obj, 'endMonth', MONTH_PATTERN);
  if (endMonth !== undefined && endMonth < startMonth) invalid('endMonth');
  return compact({
    id: id(obj),
    type: oneOf(obj, 'type', LEDGER_TYPES),
    name: str(obj, 'name', 100, 1),
    amount: amount(obj),
    category: str(obj, 'category', 30, 1),
    day,
    startMonth,
    endMonth,
    createdAt: str(obj, 'createdAt', 40, 1),
  });
}

export const PARSERS: { [C in CollectionId]: (value: unknown) => CollectionItem[C] } = {
  todos: parseTodo,
  wishlist: parseWishItem,
  categories: parseCategory,
  transactions: parseTransaction,
  fixedItems: parseFixedItem,
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
