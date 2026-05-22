import { ArrowLeft, Check, Loader2, Search, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { hairline } from '../styles/hairline';

const NAVER_OAUTH_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000';
const NAVER_OAUTH_URL = `${NAVER_OAUTH_BASE_URL}/oauth2/authorization/naver`;

export type AuthMode = 'login' | 'signup' | 'findPassword';

type AuthModalProps = {
  mode: AuthMode | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onLoginSuccess: () => void;
};

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export function AuthModal({
  mode,
  onClose,
  onModeChange,
  onLoginSuccess,
}: AuthModalProps) {
  if (!mode) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] transition-all ${hairline.modalOverlay}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-4 pointer-events-none">
        {mode === 'login' ? (
          <LoginPanel
            onClose={onClose}
            onLoginSuccess={onLoginSuccess}
            onModeChange={onModeChange}
          />
        ) : null}
        {mode === 'signup' ? (
          <SignUpPanel onClose={onClose} onModeChange={onModeChange} />
        ) : null}
        {mode === 'findPassword' ? (
          <FindPasswordPanel onClose={onClose} onModeChange={onModeChange} />
        ) : null}
      </div>
    </>
  );
}

type PanelProps = {
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

type LoginPanelProps = PanelProps & {
  onLoginSuccess: () => void;
};

function LoginPanel({
  onClose,
  onLoginSuccess,
  onModeChange,
}: LoginPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');

  const isLoading = submitState === 'loading';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    setSubmitState('loading');
    setMessage('');

    try {
      await postAuthJson('/api/auth/login', {
        email,
        password,
        keepLoggedIn,
      });
      setSubmitState('success');
      onLoginSuccess();
    } catch (error: unknown) {
      setSubmitState('error');
      setMessage(resolveAuthErrorMessage(error, '로그인 API 연결을 확인해 주세요.'));
    }
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className={`relative flex w-full max-w-md flex-col items-center rounded-[28px] p-10 pointer-events-auto animate-in fade-in zoom-in duration-300 ${hairline.panel}`}
    >
      <ModalCloseButton onClose={onClose} />
      <img src="/hamalogo.png" alt="Hama" className="mb-8 h-16" />
      <h2 id="login-title" className="sr-only">
        로그인
      </h2>

      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일 주소"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setMessage('');
          }}
          className={`${inputClass} ${submitState === 'error' ? errorInputClass : ''}`}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setMessage('');
          }}
          className={`${inputClass} ${submitState === 'error' ? errorInputClass : ''}`}
          required
        />

        {message ? <FormMessage tone="error">{message}</FormMessage> : null}

        <div className="flex items-center justify-between px-1">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                keepLoggedIn ? 'border-black bg-black' : 'border-[#C9CFDA] bg-white'
              }`}
            >
              {keepLoggedIn ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
            </span>
            <span className={`text-xs font-semibold ${keepLoggedIn ? 'text-black' : hairline.mutedText}`}>
              로그인 상태 유지
            </span>
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(event) => setKeepLoggedIn(event.target.checked)}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={() => onModeChange('findPassword')}
            className="text-xs font-semibold text-[#86868B] hover:text-black focus:outline-none focus:underline"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <SubmitButton isLoading={isLoading} loadingLabel="로그인 중...">
          로그인
        </SubmitButton>

        <button
          type="button"
          onClick={onLoginSuccess}
          className={`mx-auto flex rounded-full px-3 py-1 text-[11px] font-black text-[#86868B] transition-colors hover:bg-white/72 hover:text-gray-950 ${hairline.focus}`}
        >
          관리자 로그인
        </button>
      </form>

      <SocialDivider />
      <NaverLoginButton label="네이버로 로그인" />

      <div className="mt-6 text-sm font-semibold text-[#626873]">
        계정이 없으신가요?
        <button
          type="button"
          onClick={() => onModeChange('signup')}
          className="ml-2 font-black text-black underline"
        >
          회원가입
        </button>
      </div>
    </section>
  );
}

type SignUpStep = 'basic' | 'terms' | 'profile';

function SignUpPanel({ onClose, onModeChange }: PanelProps) {
  const [step, setStep] = useState<SignUpStep>('basic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');

  const isLoading = submitState === 'loading';
  const passwordMismatch =
    password.length > 0 && passwordConfirm.length > 0 && password !== passwordConfirm;
  const stepLabel = step === 'basic' ? '1 / 3' : step === 'terms' ? '2 / 3' : '3 / 3';
  const isWidePanel = step === 'terms';

  function handleBasicNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password || !passwordConfirm || passwordMismatch) {
      return;
    }

    setStep('terms');
  }

  function handleTermsNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreePrivacy) {
      return;
    }

    setStep('profile');
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || !birthDate || !phone || !nickname.trim()) {
      return;
    }

    setSubmitState('loading');
    setMessage('');

    try {
      await postAuthJson('/api/auth/signup', {
        email,
        password,
        birthDate,
        phone,
        nickname: nickname.trim(),
        agreeMarketing,
      });
      setSubmitState('success');
      onModeChange('login');
    } catch (error: unknown) {
      setSubmitState('error');
      setMessage(resolveAuthErrorMessage(error, '회원가입 API 연결을 확인해 주세요.'));
    }
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      className={`relative flex w-full flex-col rounded-[28px] p-10 pointer-events-auto animate-in fade-in zoom-in duration-300 my-4 ${
        isWidePanel ? 'max-w-lg' : 'max-w-md'
      } ${hairline.panel}`}
    >
      {step !== 'basic' ? (
        <button
          type="button"
          onClick={() => setStep(step === 'terms' ? 'basic' : 'terms')}
          className={`absolute left-6 top-6 rounded-full p-2 hover:bg-white ${hairline.focus}`}
          aria-label="이전 단계"
        >
          <ArrowLeft className="h-5 w-5 text-[#86868B]" />
        </button>
      ) : null}
      <ModalCloseButton onClose={onClose} />

      <div className="mb-8 text-center">
        <p className={`mb-2 text-xs font-black tracking-[0.24em] ${hairline.mutedText}`}>
          {stepLabel}
        </p>
        <h2 id="signup-title" className="text-2xl font-black leading-tight text-gray-950">
          {step === 'basic' ? '회원가입' : step === 'terms' ? '약관 확인' : '프로필 정보'}
        </h2>
      </div>

      {step === 'basic' ? (
        <form className="space-y-4" onSubmit={handleBasicNext}>
          <input
            type="email"
            placeholder="이메일 주소"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} ${passwordMismatch ? errorInputClass : ''}`}
            required
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            className={`${inputClass} ${passwordMismatch ? errorInputClass : ''}`}
            required
          />
          {passwordMismatch ? (
            <FormMessage tone="error">비밀번호가 서로 다릅니다.</FormMessage>
          ) : null}
          <SubmitButton>다음</SubmitButton>
          <SocialDivider />
          <NaverLoginButton label="네이버로 시작하기" />
        </form>
      ) : null}

      {step === 'terms' ? (
        <form className="space-y-4" onSubmit={handleTermsNext}>
          <label className={`block rounded-2xl p-4 ${hairline.card}`}>
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(event) => setAgreePrivacy(event.target.checked)}
                className="h-5 w-5 accent-black"
              />
              <span className="text-sm font-black text-gray-950">
                개인정보 수집 및 이용에 동의합니다.
              </span>
            </span>
            <span className={`mt-2 block text-xs font-semibold leading-5 ${hairline.quietText}`}>
              회원 식별, 로그인 유지, 찜 목록과 알림 제공에 필요한 최소 정보를 사용합니다.
            </span>
          </label>

          <label className={`block rounded-2xl p-4 ${hairline.card}`}>
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={agreeMarketing}
                onChange={(event) => setAgreeMarketing(event.target.checked)}
                className="h-5 w-5 accent-black"
              />
              <span className="text-sm font-black text-gray-950">
                마케팅 정보 수신에 동의합니다. <span className={hairline.quietText}>(선택)</span>
              </span>
            </span>
          </label>

          <SubmitButton disabled={!agreePrivacy}>다음</SubmitButton>
        </form>
      ) : null}

      {step === 'profile' ? (
        <form className="space-y-4" onSubmit={handleProfileSubmit}>
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className={inputClass}
            required
          />
          <input
            type="tel"
            placeholder="휴대폰 번호"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
            required
          />
          <input
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              setMessage('');
            }}
            className={`${inputClass} ${submitState === 'error' ? errorInputClass : ''}`}
            required
          />
          {message ? <FormMessage tone="error">{message}</FormMessage> : null}
          <SubmitButton isLoading={isLoading} loadingLabel="가입 중...">
            가입 완료
          </SubmitButton>
        </form>
      ) : null}

      <div className="mt-7 text-center text-sm font-semibold text-[#626873]">
        이미 회원이신가요?
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className="ml-2 font-black text-black underline"
        >
          로그인
        </button>
      </div>
    </section>
  );
}

function FindPasswordPanel({ onClose, onModeChange }: PanelProps) {
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const isLoading = submitState === 'loading';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    setSubmitState('loading');
    setMessage('');

    try {
      await postAuthJson('/api/auth/password/reset-request', { email });
      setSubmitState('success');
      setMessage('비밀번호 재설정 요청을 보냈습니다.');
    } catch (error: unknown) {
      setSubmitState('error');
      setMessage(resolveAuthErrorMessage(error, '비밀번호 재설정 API 연결을 확인해 주세요.'));
    }
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="find-password-title"
      className={`relative flex w-full max-w-md flex-col items-center rounded-[28px] p-10 pointer-events-auto animate-in fade-in zoom-in duration-300 ${hairline.panel}`}
    >
      <button
        type="button"
        onClick={() => onModeChange('login')}
        className={`absolute left-6 top-6 rounded-full p-2 hover:bg-white ${hairline.focus}`}
        aria-label="로그인으로 돌아가기"
      >
        <ArrowLeft className="h-5 w-5 text-[#86868B]" />
      </button>
      <ModalCloseButton onClose={onClose} />
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C9CFDA] bg-white">
        <Search className="h-6 w-6 text-black" />
      </div>
      <h2 id="find-password-title" className="mb-3 text-center text-2xl font-black">
        비밀번호 찾기
      </h2>
      <p className={`mb-8 text-center text-sm font-semibold leading-relaxed ${hairline.mutedText}`}>
        가입하신 이메일 주소를 입력하시면
        <br />
        재설정 링크를 보내드립니다.
      </p>
      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일 주소 입력"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setMessage('');
          }}
          className={`${inputClass} ${submitState === 'error' ? errorInputClass : ''}`}
          required
        />
        {message ? (
          <FormMessage tone={submitState === 'success' ? 'success' : 'error'}>
            {message}
          </FormMessage>
        ) : null}
        <SubmitButton isLoading={isLoading} loadingLabel="요청 중...">
          재설정 링크 보내기
        </SubmitButton>
      </form>
    </section>
  );
}

function NaverLoginButton({ label }: { label: string }) {
  return (
    <a
      href={NAVER_OAUTH_URL}
      className="flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-black text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#03C75A] focus:ring-offset-2 active:brightness-90"
      style={{ backgroundColor: '#03C75A' }}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-sm text-sm font-black leading-none"
        style={{ backgroundColor: '#fff', color: '#03C75A' }}
        aria-hidden="true"
      >
        N
      </span>
      {label}
    </a>
  );
}

function SubmitButton({
  children,
  disabled,
  isLoading = false,
  loadingLabel = '처리 중...',
}: {
  children: string;
  disabled?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-black transition-all ${hairline.primaryButton} ${hairline.focus} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {isLoading ? loadingLabel : children}
    </button>
  );
}

function SocialDivider() {
  return (
    <div className="my-6 flex w-full items-center gap-4">
      <div className="h-px flex-1 bg-[#C9CFDA]" />
      <span className={`text-xs font-semibold ${hairline.quietText}`}>또는</span>
      <div className="h-px flex-1 bg-[#C9CFDA]" />
    </div>
  );
}

function FormMessage({
  children,
  tone,
}: {
  children: string;
  tone: 'error' | 'success';
}) {
  const toneClass = tone === 'error' ? 'text-rose-600' : 'text-emerald-600';

  return (
    <p className={`px-1 text-xs font-black ${toneClass}`} role="status" aria-live="polite">
      {children}
    </p>
  );
}

function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={`absolute right-6 top-6 rounded-full p-2 hover:bg-white ${hairline.focus}`}
      aria-label="닫기"
    >
      <X className="h-6 w-6 text-[#86868B]" />
    </button>
  );
}

async function postAuthJson(path: string, body: Record<string, string | boolean>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AuthRequestError(response.status);
  }
}

function resolveAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthRequestError && error.status === 404) {
    return '아직 백엔드 인증 API가 연결되지 않았습니다. 네이버 로그인 또는 API 상태를 확인해 주세요.';
  }

  return fallback;
}

class AuthRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Auth request failed with status ${status}`);
    this.status = status;
  }
}

const inputClass =
  'w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 font-semibold outline-none transition-all focus:border-black focus:ring-2 focus:ring-black';
const errorInputClass = 'border-rose-400 focus:border-rose-500 focus:ring-rose-300';
