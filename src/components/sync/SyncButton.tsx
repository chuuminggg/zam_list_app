import { useState, type FormEvent } from 'react';
import { PASSWORD_MAX, PASSWORD_MIN, USERNAME_PATTERN } from '../../../shared/data';
import { useSyncStore, type SyncStatus } from '../../stores/syncStore';
import { retrySync, signIn, signOut } from '../../sync/sync';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

const ICON: Record<SyncStatus, string> = {
  idle: '☁️',
  loading: '🔄',
  ready: '☁️',
  error: '⚠️',
  signedOut: '👤',
  unavailable: '💾',
};

const LABEL: Record<SyncStatus, string> = {
  idle: '동기화 준비 중',
  loading: '서버와 동기화하는 중',
  ready: '서버에 저장됨',
  error: '동기화 실패',
  signedOut: '로그인 전 (이 기기에만 저장됨)',
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
        aria-label={`계정·동기화: ${label}`}
        title={label}
        className="px-2.5 py-1.5 rounded-lg text-base leading-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span aria-hidden="true" className={status === 'loading' || pending > 0 ? 'animate-pulse' : ''}>
          {ICON[status]}
        </span>
      </button>
      <Modal open={open} title="계정" onClose={() => setOpen(false)}>
        <AccountPanel onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function AccountPanel({ onClose }: { onClose: () => void }) {
  const { session, status, error } = useSyncStore();

  if (!session) return <SignInForm onClose={onClose} />;

  return (
    <>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        <span className="font-semibold">{session.user.username}</span> 님으로 로그인했어요.
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
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

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => void signOut()}>
          로그아웃
        </Button>
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>
    </>
  );
}

function SignInForm({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** 없는 아이디라 새로 만들지 확인받는 중 */
  const [confirmNew, setConfirmNew] = useState<string | null>(null);
  const valid =
    USERNAME_PATTERN.test(username.trim().toLowerCase()) &&
    password.length >= PASSWORD_MIN &&
    password.length <= PASSWORD_MAX;

  const send = async (create: boolean) => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await signIn(username.trim(), password, { create });
      // 없는 아이디면 계정을 만들기 전에 한 번 확인받는다 (오타로 계정이 갈라지지 않도록).
      if (result.status === 'new') setConfirmNew(username.trim().toLowerCase());
      else setPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '로그인하지 못했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(false);
  };

  if (confirmNew) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-semibold">{confirmNew}</span> 계정이 아직 없어요. 새로 만들까요?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          이미 쓰던 계정이 있다면 아이디에 오타가 없는지 확인하세요. 계정을 새로 만들면 목록이 두 개로 갈라져서 다른
          기기에서 적은 내용이 보이지 않아요.
        </p>
        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmNew(null)} disabled={submitting}>
            아이디 다시 입력
          </Button>
          <Button type="button" onClick={() => void send(true)} disabled={submitting}>
            {submitting ? '만드는 중…' : '새 계정 만들기'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        로그인하면 어느 기기에서든 같은 목록을 볼 수 있어요. 쓰던 계정이 있으면 다른 기기와 <b>같은 아이디</b>로
        로그인하세요.
      </p>
      <div className="space-y-1">
        <label htmlFor="sign-in-username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          아이디
        </label>
        <Input
          id="sign-in-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="2~20자 한글·영문·숫자"
          maxLength={20}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="sign-in-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          비밀번호
        </label>
        <Input
          id="sign-in-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder={`${PASSWORD_MIN}자 이상`}
          maxLength={PASSWORD_MAX}
        />
      </div>
      {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        계정에 저장된 데이터가 있으면 이 기기의 목록이 그 데이터로 바뀌어요. 계정이 비어 있으면 이 기기의 목록을
        올려요.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          닫기
        </Button>
        <Button type="submit" disabled={!valid || submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </Button>
      </div>
    </form>
  );
}
