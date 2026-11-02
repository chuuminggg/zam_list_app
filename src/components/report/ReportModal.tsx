import { useEffect, useState } from 'react';
import { fetchOliveyoungTodayDeals } from '../../api/client';
import { useApiRequest } from '../../hooks/useApiRequest';
import type { TodayDeal, TodayDeals } from '../../../shared/todayDeals';
import Button from '../common/Button';
import Modal from '../common/Modal';

interface ReportModalProps {
  onClose: () => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 2026-11-02 → 11월 2일 (월) */
function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

const won = (price: number) => price.toLocaleString('ko-KR');

function Row({ deal, showImage }: { deal: TodayDeal; showImage: boolean }) {
  return (
    <li className={`flex items-center gap-3 py-2 ${deal.soldOut ? 'opacity-50' : ''}`}>
      {showImage && deal.imageUrl && (
        <img src={deal.imageUrl} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <a
          href={deal.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-gray-900 dark:text-gray-100 line-clamp-2 hover:underline"
        >
          {deal.name}
        </a>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {[deal.brand, deal.soldOut && '일시품절'].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {won(deal.price)}
          {deal.priceFrom && '~'}
        </p>
        {deal.discountRate ? <p className="text-xs text-gray-500 dark:text-gray-400">-{deal.discountRate}%</p> : null}
      </div>
    </li>
  );
}

function Section({ title, deals, showImage }: { title: string; deals: TodayDeal[]; showImage: boolean }) {
  if (deals.length === 0) return null;
  return (
    <section>
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        {title} ({deals.length})
      </h3>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {deals.map((d) => (
          <Row key={d.goodsNo} deal={d} showImage={showImage} />
        ))}
      </ul>
    </section>
  );
}

/**
 * 올리브영 오특(오늘의 특가)을 보는 모달. 탭 이름은 업무 화면처럼 "리포트"로 두고,
 * 상품 사진은 켤 때만 보여준다. 열 때만 마운트되고 Esc로 바로 닫힌다.
 */
export default function ReportModal({ onClose }: ReportModalProps) {
  const { state, run } = useApiRequest<TodayDeals>();
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    run(fetchOliveyoungTodayDeals);
  }, [run]);

  return (
    <Modal open title="일일 리포트" onClose={onClose} placement="full" size="lg">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{state.status === 'success' ? formatDate(state.data.date) : '오늘'} 기준 · 가격은 조회 시점 기준</span>
        <label className="ml-auto flex items-center gap-1">
          <input type="checkbox" checked={showImage} onChange={(e) => setShowImage(e.target.checked)} />
          미리보기
        </label>
      </div>

      {state.status === 'loading' && <p className="text-sm text-gray-400 dark:text-gray-500">불러오는 중…</p>}
      {state.status === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">{state.message}</p>
          <Button size="sm" variant="ghost" onClick={() => run(fetchOliveyoungTodayDeals)}>
            다시 시도
          </Button>
        </div>
      )}
      {state.status === 'success' && (
        <div className="space-y-4">
          <Section title="주요 항목" deals={state.data.brandDeals} showImage={showImage} />
          <Section title="전체 항목" deals={state.data.todayDeals} showImage={showImage} />
          {state.data.brandDeals.length + state.data.todayDeals.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">오늘 항목이 없습니다.</p>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="ghost" onClick={onClose} className="w-full">
          닫기
        </Button>
      </div>
    </Modal>
  );
}
