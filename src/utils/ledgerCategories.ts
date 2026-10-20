import { FALLBACK_CATEGORY_ID, LEDGER_CATEGORIES, findCategory, type LedgerCategory } from '../constants/ledger';
import type { LedgerCategorySetting, LedgerType } from '../types';

/** 기본 카테고리 수정본의 저장 id */
export function builtinSettingId(type: LedgerType, base: string): string {
  return `${type}-${base}`;
}

/** 화면에 쓰는 카테고리. 기본 카테고리면 수정본을 반영한 값이다. */
export interface ResolvedCategory extends LedgerCategory {
  builtin: boolean;
  hidden: boolean;
  /** 기본 카테고리를 고친 상태인지 */
  edited: boolean;
}

/** 한 구분의 모든 카테고리 (숨긴 것 포함). 기본 카테고리 순서대로, 그 뒤에 사용자 카테고리를 만든 순서대로 */
export function ledgerCategories(type: LedgerType, settings: LedgerCategorySetting[]): ResolvedCategory[] {
  const ofType = settings.filter((s) => s.type === type);
  const builtins = LEDGER_CATEGORIES[type].map((c) => {
    const edit = ofType.find((s) => s.base === c.id);
    return {
      id: c.id,
      name: edit?.name ?? c.name,
      color: edit?.color ?? c.color,
      icon: edit?.icon ?? c.icon,
      builtin: true,
      // '기타'는 카테고리를 지울 때 옮겨 갈 곳이라 숨기지 않는다.
      hidden: c.id !== FALLBACK_CATEGORY_ID && edit?.hidden === true,
      edited: edit !== undefined,
    };
  });
  const custom = ofType
    .filter((s) => s.base === undefined)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((s) => ({ id: s.id, name: s.name, color: s.color, icon: s.icon, builtin: false, hidden: false, edited: false }));
  return [...builtins, ...custom];
}

/** 고르는 목록에 보일 카테고리. keep은 숨겼어도 지금 선택된 카테고리라 함께 보여준다. */
export function visibleCategories(
  type: LedgerType,
  settings: LedgerCategorySetting[],
  keep?: string
): ResolvedCategory[] {
  return ledgerCategories(type, settings).filter((c) => !c.hidden || c.id === keep);
}

/** 내역의 카테고리 id를 화면용 카테고리로. 지운 카테고리면 id를 이름으로 보여준다. */
export function resolveCategory(type: LedgerType, id: string, settings: LedgerCategorySetting[]): LedgerCategory {
  return ledgerCategories(type, settings).find((c) => c.id === id) ?? findCategory(type, id);
}

/** 새 내역의 기본 카테고리: preferred가 보이면 그것, 아니면 보이는 첫 카테고리 */
export function defaultCategory(type: LedgerType, settings: LedgerCategorySetting[], preferred: string): string {
  const visible = visibleCategories(type, settings);
  return (visible.find((c) => c.id === preferred) ?? visible[0]).id;
}
