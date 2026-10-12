import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProductResult } from '../../../shared/api';
import { refetchProduct } from '../../api/client';
import { useApiRequest } from '../../hooks/useApiRequest';
import { parseDaangnLink } from '../../utils/daangnLink';
import Button from '../common/Button';
import Input from '../common/Input';
import ProductResultList from './ProductResultList';

interface DaangnLinkPickerProps {
  onSelect: (product: ProductResult) => void;
  selectedIds?: ReadonlySet<string>;
  actionLabel?: string;
  selectedLabel?: string;
  autoFocus?: boolean;
}

/**
 * 당근 매물 링크를 붙여 넣어 담는다. 당근 검색은 서버 요청에 결과를 비워 보내지만(배포 환경 포함) 상세 조회는 되므로
 * 당근 탭의 기본 방법으로 쓴다. 링크의 매물을 다시 불러와 제목·가격·사진·판매상태를 채운다.
 */
export default function DaangnLinkPicker({
  onSelect,
  selectedIds,
  actionLabel,
  selectedLabel,
  autoFocus,
}: DaangnLinkPickerProps) {
  const [link, setLink] = useState('');
  const [invalid, setInvalid] = useState(false);
  const { state, run } = useApiRequest<ProductResult>();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = parseDaangnLink(link);
    setInvalid(!id);
    if (!id) return;
    run((signal) => refetchProduct('daangn', id, '', signal));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        당근 앱·웹에서 매물 → 공유 → 링크 복사 후 붙여 넣어 주세요. 공유 문구째 붙여 넣어도 돼요.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          accent="purple"
          aria-label="당근 매물 링크"
          placeholder="https://www.daangn.com/kr/buy-sell/…"
          value={link}
          autoFocus={autoFocus}
          onChange={(e) => {
            setLink(e.target.value);
            setInvalid(false);
          }}
          className="text-sm"
        />
        <Button
          type="submit"
          variant="accent"
          disabled={link.trim() === '' || state.status === 'loading'}
          className="flex-shrink-0"
        >
          불러오기
        </Button>
      </form>
      {invalid && <p className="text-sm text-red-500">당근 매물 링크가 아니에요. 매물 페이지 주소를 붙여 넣어 주세요.</p>}
      {state.status === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중…</p>}
      {state.status === 'error' && <p className="text-sm text-red-500">{state.message}</p>}
      {state.status === 'success' && (
        <ProductResultList
          products={[state.data]}
          onSelect={onSelect}
          selectedIds={selectedIds}
          actionLabel={actionLabel}
          selectedLabel={selectedLabel}
        />
      )}
    </div>
  );
}
