import { useState } from 'react';
import { SYNC_KEY_PATTERN } from '../../../shared/data';
import { useSyncStore, type SyncStatus } from '../../stores/syncStore';
import { connectSyncKey, retrySync } from '../../sync/sync';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

const ICON: Record<SyncStatus, string> = {
  idle: '☁️',
  loading: '🔄',
  ready: '☁️',
  error: '⚠️',
  unavailable: '💾',
};

const LABEL: Record<SyncStatus, string> = {
  idle: '동기화 준비 중',
  loading: '서버와 동기화하는 중',
  ready: '서버에 저장됨',
  error: '동기화 실패',
  unavailable: '이 기기에만 저장됨',
};

export default function SyncButton() {
  const status = useSyncStore((s) => s.status);
  const pending = useSyncStore((s) => s.pending);
  const [open, setOpen] = useState(false);
  const label = status === 'ready' && pending > 0 ? '저장하는 중' : LABEL[status];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`동기화: ${label}`}
        title={label}
        className="px-2.5 py-1.5 rounded-lg text-base leading-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span aria-hidden="true" className={status === 'loading' || pending > 0 ? 'animate-pulse' : ''}>
          {ICON[status]}
        </span>
      </button>
      <SyncModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { syncKey, status, error } = useSyncStore();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const trimmed = input.trim();
  const inputValid = SYNC_KEY_PATTERN.test(trimmed) && trimmed !== syncKey;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(syncKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 입력창에서 직접 복사한다.
    }
  };

  const connect = async () => {
    await connectSyncKey(trimmed);
    setInput('');
  };

  return (
    <Modal open={open} title="데이터 동기화" onClose={onClose}>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        <span aria-hidden="true">{ICON[status]}</span> {LABEL[status]}
      </p>

      {status === 'unavailable' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          서버 저장소가 설정되지 않아 이 브라우저에만 저장하고 있어요.
        </p>
      )}

      {status === 'error' && error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
          <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {error.phase === 'save'
              ? '변경 내용은 이 기기에 남아 있어요. 다시 시도하면 이 기기의 데이터로 서버를 덮어씁니다.'
              : '다시 시도하면 서버에서 데이터를 불러옵니다.'}
          </p>
          <Button size="sm" onClick={() => void retrySync()}>
            다시 시도
          </Button>
        </div>
      )}

      {status !== 'unavailable' && (
        <>
          <div className="space-y-1">
            <label htmlFor="sync-key" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              이 기기의 동기화 키
            </label>
            <div className="flex gap-2">
              <Input id="sync-key" readOnly value={syncKey} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
              <Button variant="ghost" size="sm" onClick={copy} className="shrink-0">
                {copied ? '복사됨' : '복사'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              다른 기기에 이 키를 입력하면 같은 데이터를 볼 수 있어요. 키를 아는 사람은 누구나 데이터를 읽고 고칠 수 있으니
              공유하지 마세요.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="sync-key-connect" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              다른 기기의 키로 연결
            </label>
            <div className="flex gap-2">
              <Input
                id="sync-key-connect"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="동기화 키 붙여넣기"
                className="font-mono text-xs"
              />
              <Button size="sm" onClick={connect} disabled={!inputValid || status === 'loading'} className="shrink-0">
                연결
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              연결하면 이 기기의 목록이 해당 키에 저장된 데이터로 바뀝니다. (서버에 데이터가 없으면 이 기기의 데이터를 올려요)
            </p>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>
    </Modal>
  );
}
