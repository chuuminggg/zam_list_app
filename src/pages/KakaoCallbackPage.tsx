import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PASSWORD_MAX, USERNAME_PATTERN } from '../../shared/data';
import type { KakaoCallbackResult } from '../../shared/kakao';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { finishKakao, signInWithKakaoTicket } from '../sync/sync';

/**
 * 인가 코드는 한 번만 쓸 수 있어서 StrictMode의 이중 실행에도 한 번만 보낸다.
 * 코드별 요청을 모듈에 기억해 두고 다시 마운트되면 같은 결과를 기다린다.
 */
const requests = new Map<string, Promise<KakaoCallbackResult>>();

type View =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; message: string }
  | { kind: 'unlinked'; ticket: string; nickname: string | null };

/** 카카오 로그인 Redirect URI (/auth/kakao) */
export default function KakaoCallbackPage() {
  const [params] = useSearchParams();
  const code = params.get('code');
  const state = params.get('state');
  const kakaoError = params.get('error');
  const [view, setView] = useState<View>(() =>
    kakaoError || !code || !state
      ? {
          kind: 'error',
          message:
            kakaoError === 'access_denied' ? '카카오 로그인을 취소했어요.' : '카카오 로그인 정보가 없어요. 다시 시도하세요.',
        }
      : { kind: 'loading' }
  );

  useEffect(() => {
    if (kakaoError || !code || !state) return;
    let request = requests.get(code);
    if (!request) {
      request = finishKakao(code, state);
      requests.set(code, request);
    }
    let active = true;
    request
      .then((result) => {
        if (!active) return;
        if (result.status === 'signedIn') setView({ kind: 'done', message: `${result.user.username} 계정으로 로그인했어요.` });
        else if (result.status === 'linked')
          setView({ kind: 'done', message: `${result.user.username} 계정에 카카오를 연결했어요.` });
        else setView({ kind: 'unlinked', ticket: result.ticket, nickname: result.nickname });
      })
      .catch((error: unknown) => {
        if (active) setView({ kind: 'error', message: error instanceof Error ? error.message : '카카오 로그인에 실패했어요.' });
      });
    return () => {
      active = false;
    };
  }, [code, state, kakaoError]);

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">카카오 로그인</h1>
        {view.kind === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">확인하는 중…</p>}
        {view.kind === 'error' && (
          <>
            <p className="text-sm text-red-600 dark:text-red-400">{view.message}</p>
            <HomeLink />
          </>
        )}
        {view.kind === 'done' && (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300">{view.message}</p>
            <HomeLink />
          </>
        )}
        {view.kind === 'unlinked' && <UnlinkedForm ticket={view.ticket} nickname={view.nickname} />}
      </div>
    </div>
  );
}

function HomeLink() {
  return (
    <Link to="/" replace className="inline-block text-sm text-indigo-600 dark:text-indigo-400 underline">
      처음 화면으로
    </Link>
  );
}

/** 연결된 계정이 없는 카카오: 쓰던 계정에 연결하거나 새 계정을 만든다. */
function UnlinkedForm({ ticket, nickname }: { ticket: string; nickname: string | null }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'attach' | 'signup'>('attach');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const usernameValid = USERNAME_PATTERN.test(username.trim().toLowerCase());
  const valid = usernameValid && (mode === 'signup' || (password.length >= 1 && password.length <= PASSWORD_MAX));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await signInWithKakaoTicket(ticket, username.trim(), mode === 'attach' ? password : undefined);
      navigate('/', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '처리하지 못했어요.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {nickname ? `${nickname} 님, ` : ''}이 카카오 계정에 연결된 ZAM 계정이 없어요.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'attach' ? 'toggle-active' : 'toggle'}
          onClick={() => setMode('attach')}
        >
          쓰던 계정에 연결
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'signup' ? 'toggle-active' : 'toggle'}
          onClick={() => setMode('signup')}
        >
          새 계정 만들기
        </Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {mode === 'attach'
          ? '쓰던 아이디와 비밀번호를 확인하면 카카오를 연결해요. 다음부터는 카카오로 로그인하고 아이디도 찾을 수 있어요.'
          : '비밀번호 없이 카카오로만 로그인하는 계정을 만들어요. 쓰던 계정이 있다면 목록이 갈라지니 연결을 고르세요.'}
      </p>
      <div className="space-y-1">
        <label htmlFor="kakao-username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {mode === 'attach' ? '쓰던 아이디' : '새 아이디'}
        </label>
        <Input
          id="kakao-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="2~20자 한글·영문·숫자"
          maxLength={20}
        />
      </div>
      {mode === 'attach' && (
        <div className="space-y-1">
          <label htmlFor="kakao-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            비밀번호
          </label>
          <Input
            id="kakao-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            maxLength={PASSWORD_MAX}
          />
        </div>
      )}
      {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => navigate('/', { replace: true })} disabled={submitting}>
          취소
        </Button>
        <Button type="submit" disabled={!valid || submitting}>
          {submitting ? '처리하는 중…' : mode === 'attach' ? '연결하고 로그인' : '계정 만들기'}
        </Button>
      </div>
    </form>
  );
}
