import { useState, type FormEvent } from 'react';
import { PASSWORD_MAX, USERNAME_PATTERN, passwordPolicyError } from '../../../shared/data';
import { unlinkKakaoRequest } from '../../api/client';
import { useKakao } from '../../hooks/useKakao';
import { useSyncStore, type SyncStatus } from '../../stores/syncStore';
import { resetPassword, retrySync, signIn, signOut } from '../../sync/sync';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import KakaoButton from './KakaoButton';

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

      <KakaoSection token={session.token} />

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

/** 로그인한 계정의 카카오 연결 상태. 연결해 두면 아이디를 잊어도 카카오로 들어올 수 있다. */
function KakaoSection({ token }: { token: string }) {
  const { state, reload } = useKakao();
  const [message, setMessage] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  if (!state?.enabled) return null;

  const unlink = async () => {
    setUnlinking(true);
    setMessage(null);
    try {
      await unlinkKakaoRequest(token);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '연결을 끊지 못했어요.');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      {state.link ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            카카오 연결됨
            {state.link.nickname ? ` (${state.link.nickname})` : ''}
          </p>
          {state.hasPassword && (
            <Button size="sm" variant="ghost" onClick={() => void unlink()} disabled={unlinking}>
              {unlinking ? '끊는 중…' : '연결 끊기'}
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            카카오를 연결해 두면 아이디나 비밀번호를 잊어도 카카오로 로그인할 수 있어요.
          </p>
          <KakaoButton mode="link" label="카카오 연결하기" onError={setMessage} />
        </>
      )}
      {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
    </div>
  );
}

/** 아이디 찾기: 이 기기에서 로그인했던 아이디와 카카오 로그인 */
function FindUsernamePanel({ onPick, onBack }: { onPick: (username: string) => void; onBack: () => void }) {
  const recent = useSyncStore((s) => s.recentUsernames);
  const { state } = useKakao();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">아이디 찾기</p>
      {recent.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            이 기기에서 로그인했던 아이디예요. 눌러서 고르세요.
          </p>
          <div className="flex flex-wrap gap-2">
            {recent.map((name) => (
              <Button key={name} size="sm" variant="toggle" onClick={() => onPick(name)}>
                {name}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">이 기기에서 로그인한 기록이 없어요.</p>
      )}
      {state?.enabled && (
        <div className="space-y-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            카카오를 연결해 둔 계정이면 카카오로 바로 로그인돼요.
          </p>
          <KakaoButton mode="login" label="카카오로 아이디 찾기" onError={setMessage} />
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        둘 다 안 되면 쓰던 다른 기기에서 계정 메뉴를 열어 아이디를 확인하세요. 계정에 연락처를 저장하지 않아서 그 밖의
        방법으로는 찾을 수 없어요.
      </p>
      {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={onBack}>
          돌아가기
        </Button>
      </div>
    </div>
  );
}

function SignInForm({ onClose }: { onClose: () => void }) {
  const { state: kakao } = useKakao();
  /** 아이디 찾기 화면을 보는 중 */
  const [finding, setFinding] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** 없는 아이디라 새로 만들지 확인받는 중 */
  const [confirmNew, setConfirmNew] = useState<string | null>(null);
  /** 비밀번호 초기화를 확인받는 중인 아이디 */
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  /** 임시 비밀번호로 로그인해서 새 비밀번호를 정하는 중 */
  const [changing, setChanging] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const usernameValid = USERNAME_PATTERN.test(username.trim().toLowerCase());
  const valid = usernameValid && password.length >= 1 && password.length <= PASSWORD_MAX;
  /** 새 계정을 만들 때만 적용하는 비밀번호 규칙 */
  const policyError = confirmNew ? passwordPolicyError(password) : null;

  const send = async (create: boolean) => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setMessage(null);
    setNotice(null);
    try {
      const result = await signIn(username.trim(), password, { create });
      // 없는 아이디면 계정을 만들기 전에 한 번 확인받는다 (오타로 계정이 갈라지지 않도록).
      if (result.status === 'new') setConfirmNew(username.trim().toLowerCase());
      else if (result.status === 'mustChange') setChanging({ username: username.trim(), password });
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

  const reset = async () => {
    if (!confirmReset || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const temporary = await resetPassword(confirmReset);
      setConfirmReset(null);
      setPassword('');
      setNotice(`비밀번호를 초기화했어요. 임시 비밀번호 ${temporary}(오늘 날짜)로 로그인한 뒤 새 비밀번호를 정하세요.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '비밀번호를 초기화하지 못했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (finding) {
    return (
      <FindUsernamePanel
        onPick={(name) => {
          setUsername(name);
          setMessage(null);
          setNotice(`아이디 ${name}을(를) 넣었어요. 비밀번호를 입력하세요.`);
          setFinding(false);
        }}
        onBack={() => setFinding(false)}
      />
    );
  }

  if (changing) {
    return (
      <ChangePasswordForm
        username={changing.username}
        temporary={changing.password}
        onCancel={() => {
          setChanging(null);
          setPassword('');
        }}
      />
    );
  }

  if (confirmReset) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-semibold">{confirmReset}</span> 계정의 비밀번호를 오늘 날짜(예: 20261006)로
          초기화할까요?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          초기화하면 다른 기기에서는 로그아웃돼요. 임시 비밀번호로 로그인하면 새 비밀번호를 정해야 해요.
        </p>
        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmReset(null)} disabled={submitting}>
            취소
          </Button>
          <Button type="button" onClick={() => void reset()} disabled={submitting}>
            {submitting ? '초기화하는 중…' : '초기화'}
          </Button>
        </div>
      </div>
    );
  }

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
        {policyError && <p className="text-sm text-red-600 dark:text-red-400">{policyError}</p>}
        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmNew(null)} disabled={submitting}>
            {policyError ? '다시 입력' : '아이디 다시 입력'}
          </Button>
          <Button type="button" onClick={() => void send(true)} disabled={submitting || policyError !== null}>
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
          placeholder="새 계정은 영문·숫자·특수문자 섞어 8자 이상"
          maxLength={PASSWORD_MAX}
        />
      </div>
      {notice && <p className="text-sm text-indigo-600 dark:text-indigo-400">{notice}</p>}
      {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setNotice(null);
            setFinding(true);
          }}
          className="text-xs text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-200"
        >
          아이디를 잊었어요
        </button>
        <button
          type="button"
          onClick={() => {
            if (!usernameValid) {
              setMessage('초기화할 아이디를 먼저 입력하세요.');
              return;
            }
            setMessage(null);
            setNotice(null);
            setConfirmReset(username.trim().toLowerCase());
          }}
          className="text-xs text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-200"
        >
          비밀번호를 잊었어요
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        계정에 저장된 데이터가 있으면 이 기기의 목록이 그 데이터로 바뀌어요. 계정이 비어 있으면 이 기기의 목록을 올려요.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          닫기
        </Button>
        <Button type="submit" disabled={!valid || submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </Button>
      </div>
      {kakao?.enabled && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <KakaoButton mode="login" label="카카오로 로그인" onError={setMessage} />
        </div>
      )}
    </form>
  );
}

/** 초기화된 계정으로 로그인할 때 새 비밀번호를 정한다. 저장하면 바로 로그인된다. */
function ChangePasswordForm({
  username,
  temporary,
  onCancel,
}: {
  username: string;
  temporary: string;
  onCancel: () => void;
}) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const policyError = next ? passwordPolicyError(next) : null;
  const mismatch = confirm.length > 0 && confirm !== next;
  const valid = next.length > 0 && !policyError && confirm === next;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await signIn(username, temporary, { newPassword: next });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '비밀번호를 바꾸지 못했어요.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        임시 비밀번호로 로그인했어요. <span className="font-semibold">{username.toLowerCase()}</span> 계정에서 쓸 새
        비밀번호를 정하세요.
      </p>
      <div className="space-y-1">
        <label htmlFor="new-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          새 비밀번호
        </label>
        <Input
          id="new-password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          placeholder="영문·숫자·특수문자 섞어 8자 이상"
          maxLength={PASSWORD_MAX}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="new-password-confirm" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          새 비밀번호 확인
        </label>
        <Input
          id="new-password-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
        />
      </div>
      {policyError && <p className="text-sm text-red-600 dark:text-red-400">{policyError}</p>}
      {mismatch && <p className="text-sm text-red-600 dark:text-red-400">새 비밀번호가 서로 달라요.</p>}
      {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          취소
        </Button>
        <Button type="submit" disabled={!valid || submitting}>
          {submitting ? '저장하는 중…' : '저장하고 로그인'}
        </Button>
      </div>
    </form>
  );
}
