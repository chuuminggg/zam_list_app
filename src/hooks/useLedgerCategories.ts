import { useMemo } from 'react';
import { useLedgerCategoryStore } from '../stores/ledgerCategoryStore';
import type { LedgerType } from '../types';
import { defaultCategory, ledgerCategories, resolveCategory, visibleCategories } from '../utils/ledgerCategories';

/** 기본 카테고리 + 사용자 설정을 합친 가계부 카테고리 조회 */
export function useLedgerCategories() {
  const settings = useLedgerCategoryStore((s) => s.categories);
  return useMemo(
    () => ({
      all: (type: LedgerType) => ledgerCategories(type, settings),
      visible: (type: LedgerType, keep?: string) => visibleCategories(type, settings, keep),
      find: (type: LedgerType, id: string) => resolveCategory(type, id, settings),
      defaultFor: (type: LedgerType, preferred: string) => defaultCategory(type, settings, preferred),
    }),
    [settings]
  );
}
