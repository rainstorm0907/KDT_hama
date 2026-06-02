import { ArrowLeft, Check, Loader2, Mail, Search, X } from 'lucide-react';
import React, { useState } from 'react';
import { hairline } from '../styles/hairline';

const NAVER_OAUTH_URL = `${import.meta.env.VITE_API_BASE_URL ?? ''}/oauth2/authorization/naver`;

export type AuthMode = 'login' | 'signup' | 'findPassword';

type AuthModalProps = {
  mode: AuthMode | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onLoginSuccess: () => void;
};

export function AuthModal({ mode, onClose, onModeChange, onLoginSuccess }: AuthModalProps) {
  if (!mode) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] transition-all ${hairline.modalOverlay}`}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        {mode === 'login' && (
          <LoginPanel onClose={onClose} onLoginSuccess={onLoginSuccess} onModeChange={onModeChange} />
        )}
        {mode === 'signup' && (
          <SignUpPanel onClose={onClose} onModeChange={onModeChange} onLoginSuccess={onLoginSuccess} />
        )}
        {mode === 'findPassword' && (
          <FindPasswordPanel onClose={onClose} onModeChange={onModeChange} />
        )}
      </div>
    </>
  );
}

type PanelProps = {
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

type LoginPanelProps = PanelProps & { onLoginSuccess: () => void };

function LoginPanel({ onClose, onLoginSuccess, onModeChange }: LoginPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    // TODO(BE): POST /api/auth/login { email, password, keepLoggedIn }
    setTimeout(() => {
      const isInvalid = email === 'wrong@test.com' || password === 'wrong';
      if (isInvalid) {
        setIsLoading(false);
        setError('이메일 또는 비밀번호가 일치하지 않습니다.');
        return;
      }
      setIsLoading(false);
      onLoginSuccess();
    }, 900);
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className={`relative flex w-full max-w-md flex-col items-center rounded-[28px] p-10 pointer-events-auto animate-in fade-in zoom-in duration-300 ${hairline.panel}`}
    >
      <ModalCloseButton onClose={onClose} />
      <img src="/hamalogo.png" alt="Hama" className="h-16 mb-8" />
      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일 주소"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
          className={`${inputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-400' : ''}`}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
          className={`${inputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-400' : ''}`}
          required
        />
        {error && (
          <p className="px-1 text-xs font-semibold text-red-500" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between px-1">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                keepLoggedIn ? 'border-black bg-black' : 'border-gray-300 bg-white'
              }`}
            >
              {keepLoggedIn && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </span>
            <span className={`text-xs font-semibold ${keepLoggedIn ? 'text-black' : 'text-gray-500'}`}>
              로그인 상태 유지
            </span>
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(e) => setKeepLoggedIn(e.target.checked)}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={() => onModeChange('findPassword')}
            className="text-xs font-medium text-gray-400 hover:text-black focus:outline-none focus:underline"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus} disabled:opacity-70 disabled:cursor-not-allowed`}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <SocialDivider />
      <NaverLoginButton label="네이버로 로그인" />

      <div className="mt-6 text-sm text-gray-500">
        계정이 없으신가요?
        <button type="button" onClick={() => onModeChange('signup')} className="ml-2 text-black font-bold underline">
          회원가입
        </button>
      </div>
    </section>
  );
}

// ─── 중복 가입 방지용 목 데이터 ───────────────────────────────────────
const TAKEN_BIRTH_DATES = ['1999-01-15', '2000-03-15', '2001-05-20'];
const TAKEN_NICKNAMES   = ['하마팬', '중고왕', '번개맨'];

type SignUpStep = 'choice' | 'basic' | 'terms' | 'personal';

function SignUpPanel({ onClose, onModeChange, onLoginSuccess }: PanelProps & { onLoginSuccess: () => void }) {
  const [step, setStep] = useState<SignUpStep>('choice');

  // step 1
  const [email, setEmail]       = useState('');
  const [pw, setPw]             = useState('');
  const [pwConfirm, setPwConfirm] = useState('');

  // step 2
  const [agreePrivacy, setAgreePrivacy]     = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // step 3
  const [name, setName]         = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthFocused, setBirthFocused] = useState(false);
  const [phone, setPhone]       = useState('');
  const [nickname, setNickname] = useState('');
  const [birthError, setBirthError]     = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pwMismatch = pw !== '' && pwConfirm !== '' && pw !== pwConfirm;

  function handleBasicNext(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pw || !pwConfirm || pwMismatch) return;
    setStep('terms');
  }

  function handleTermsNext(e: React.FormEvent) {
    e.preventDefault();
    if (!agreePrivacy) return;
    setStep('personal');
  }

  function handlePersonalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    let valid = true;

    if (TAKEN_BIRTH_DATES.includes(birthDate)) {
      setBirthError('이미 있는 생년월일입니다.');
      valid = false;
    } else {
      setBirthError('');
    }

    if (TAKEN_NICKNAMES.includes(nickname.trim())) {
      setNicknameError('이미 있는 닉네임입니다.');
      valid = false;
    } else {
      setNicknameError('');
    }

    if (valid) {
      setIsSubmitting(true);
      // TODO(BE): POST /api/auth/signup
      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess();
      }, 900);
    }
  }

  const VISUAL_STEPS: SignUpStep[] = ['choice', 'basic', 'terms', 'personal'];
  const stepLabel = `${VISUAL_STEPS.indexOf(step) + 1} / 4`;
  const isWide = step === 'terms';

  function handleBack() {
    if (step === 'basic') setStep('choice');
    else if (step === 'terms') setStep('basic');
    else if (step === 'personal') setStep('terms');
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      className={`relative flex w-full flex-col rounded-[28px] p-10 pointer-events-auto animate-in fade-in zoom-in duration-300 my-4 ${
        isWide ? 'max-w-lg' : 'max-w-md'
      } ${hairline.panel}`}
    >
      {step !== 'choice' && (
        <button
          type="button"
          onClick={handleBack}
          className={`absolute left-6 top-6 rounded-full p-2 hover:bg-white ${hairline.focus}`}
          aria-label="이전 단계"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
      )}
      <ModalCloseButton onClose={onClose} />

      {/* 단계 표시 */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {VISUAL_STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              s === step ? 'w-6 bg-black' : i < VISUAL_STEPS.indexOf(step) ? 'w-3 bg-gray-400' : 'w-3 bg-gray-200'
            }`}
          />
        ))}
        <span className={`ml-1 text-xs font-bold ${hairline.quietText}`}>{stepLabel}</span>
      </div>

      {/* ── Step 1-0: 회원가입 방법 선택 ── */}
      {step === 'choice' && (
        <>
          <h2 id="signup-title" className="text-2xl font-bold mb-2 text-center leading-tight">
            계정을 만들어보세요
          </h2>
          <p className={`text-sm text-center mb-8 ${hairline.mutedText}`}>회원가입 방법을 선택해주세요</p>
          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep('basic')}
              className={`flex items-center gap-4 w-full rounded-2xl border-2 border-[#C9CFDA] bg-white px-6 py-5 text-left hover:border-black transition-all group ${hairline.focus}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 group-hover:bg-gray-200 transition-colors">
                <Mail className="w-5 h-5 text-gray-600" />
              </span>
              <div>
                <p className="font-bold text-gray-900">이메일로 회원가입</p>
                <p className="text-xs text-gray-400 mt-0.5">이메일과 비밀번호로 가입</p>
              </div>
            </button>
            <a
              href={NAVER_OAUTH_URL}
              className="flex items-center gap-4 w-full rounded-2xl border-2 border-[#C9CFDA] bg-white px-6 py-5 text-left hover:border-[#03C75A] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#03C75A]"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black leading-none"
                style={{ backgroundColor: '#03C75A', color: '#fff' }}
                aria-hidden="true"
              >
                N
              </span>
              <div>
                <p className="font-bold text-gray-900">네이버로 회원가입</p>
                <p className="text-xs text-gray-400 mt-0.5">네이버 계정으로 간편 가입</p>
              </div>
            </a>
          </div>
          <div className="mt-6 text-sm text-gray-500 text-center">
            이미 회원이신가요?
            <button type="button" onClick={() => onModeChange('login')} className="ml-2 text-black font-bold underline">
              로그인
            </button>
          </div>
        </>
      )}

      {/* ── Step 1-1: 계정 정보 입력 ── */}
      {step === 'basic' && (
        <>
          <h2 id="signup-title" className="text-2xl font-bold mb-6 text-center leading-tight">
            이메일로 가입하기
          </h2>
          <form className="w-full space-y-4" onSubmit={handleBasicNext}>
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={inputClass}
              required
            />
            <div>
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                className={`${inputClass} ${pwMismatch ? 'border-red-400 focus:border-red-500 focus:ring-red-400' : ''}`}
                required
              />
              {pwMismatch && (
                <p className="mt-1.5 px-1 text-xs font-semibold text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
            <button
              disabled={!email || !pw || !pwConfirm || pwMismatch}
              className={`mt-2 w-full rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              다음
            </button>
          </form>
        </>
      )}

      {/* ── Step 2: 약관 동의 ── */}
      {step === 'terms' && (
        <>
          <h2 id="signup-title" className="text-2xl font-bold mb-1 text-center">서비스 약관 동의</h2>
          <p className={`text-sm text-center mb-6 ${hairline.mutedText}`}>아래 약관을 읽고 동의 여부를 선택해주세요</p>
          <form className="w-full flex flex-col gap-5" onSubmit={handleTermsNext}>

            {/* 개인정보 수집 및 이용 동의 (필수) */}
            <TermsBanner
              badge="필수"
              title="개인정보 수집 및 이용 동의"
              agreed={agreePrivacy}
              onAgree={setAgreePrivacy}
            >
              <Article title="수집 항목">
                이름, 생년월일, 전화번호, 닉네임, 이메일 주소, 비밀번호(암호화 저장), 서비스 이용 기록, 접속 IP
              </Article>
              <Article title="수집 및 이용 목적">
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>회원 식별 및 본인 확인</li>
                  <li>중고 물품 가격 비교 서비스 제공</li>
                  <li>찜 목록·최근 본 상품 등 맞춤 기능 제공</li>
                  <li>부정 이용 방지 및 법적 의무 이행</li>
                </ul>
              </Article>
              <Article title="보유 및 이용 기간">
                회원 탈퇴 시 즉시 파기. 단 전자상거래법에 따른 거래 기록은 5년, 접속 로그는 3개월 보관
              </Article>
              <Article title="동의 거부 시 불이익">
                개인정보 수집·이용에 동의하지 않을 권리가 있으나, 거부 시 서비스 이용이 불가합니다.
              </Article>
            </TermsBanner>

            {/* 알림 수신 동의 (마케팅) (선택) */}
            <TermsBanner
              badge="선택"
              title="알림 수신 동의 (마케팅)"
              agreed={agreeMarketing}
              onAgree={setAgreeMarketing}
            >
              <Article title="수신 채널">앱 푸시, 이메일, SMS</Article>
              <Article title="발송 내용">
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>관심 상품 가격 하락 알림</li>
                  <li>저장한 키워드의 새 매물 등록 알림</li>
                  <li>Hama 신규 기능 및 이벤트 안내</li>
                </ul>
              </Article>
              <Article title="보유 기간">동의 철회 시 즉시 중단. 마이페이지 설정에서 언제든지 변경 가능</Article>
              <Article title="동의 거부 시 불이익">
                선택 항목으로 동의하지 않아도 기본 서비스 이용에는 제한이 없습니다.
              </Article>
            </TermsBanner>

            <button
              disabled={!agreePrivacy}
              className={`w-full rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              동의하고 계속
            </button>
          </form>
        </>
      )}

      {/* ── Step 3: 개인 정보 ── */}
      {step === 'personal' && (
        <>
          <h2 id="signup-title" className="text-2xl font-bold mb-6 text-center leading-tight">
            기본 정보를
            <br />
            알려주세요
          </h2>
          <form className="w-full space-y-4" onSubmit={handlePersonalSubmit}>
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
            />

            <div>
              <input
                type="text"
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setNicknameError(''); }}
                className={`${inputClass} ${nicknameError ? 'border-red-400 focus:border-red-500 focus:ring-red-400' : ''}`}
                required
              />
              {nicknameError && (
                <p className="mt-1.5 px-1 text-xs font-semibold text-red-500">{nicknameError}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type="date"
                  value={birthDate}
                  onFocus={() => setBirthFocused(true)}
                  onBlur={() => setBirthFocused(false)}
                  onChange={(e) => { setBirthDate(e.target.value); setBirthError(''); }}
                  className={`${inputClass} ${birthError ? 'border-red-400 focus:border-red-500 focus:ring-red-400' : ''} ${!birthDate && !birthFocused ? '[color:transparent]' : ''}`}
                  required
                />
                {!birthDate && !birthFocused && (
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                    YYYY. MM. DD
                  </span>
                )}
              </div>
              {birthError && (
                <p className="mt-1.5 px-1 text-xs font-semibold text-red-500">{birthError}</p>
              )}
            </div>

            <input
              type="tel"
              placeholder="전화번호 (010-0000-0000)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              required
            />

            <button
              disabled={!name || !nickname || !birthDate || !phone || isSubmitting}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? '가입 중...' : '시작하기'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

// ─── 약관 배너 컴포넌트 ────────────────────────────────────────────────
function TermsBanner({
  badge,
  title,
  agreed,
  onAgree,
  children,
}: {
  badge: '필수' | '선택';
  title: string;
  agreed: boolean;
  onAgree: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const badgeClass = badge === '필수'
    ? 'bg-black text-white'
    : 'bg-gray-100 text-gray-600';

  return (
    <div className={`rounded-[20px] border transition-all ${agreed ? 'border-black' : 'border-[#C9CFDA]'} bg-white/70`}>
      {/* 약관 전문 */}
      <div className="overflow-y-auto max-h-44 px-5 pt-5 pb-3 text-xs text-gray-500 leading-relaxed space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${badgeClass}`}>{badge}</span>
          <span className="font-bold text-gray-900 text-sm">{title}</span>
        </div>
        {children}
      </div>
      {/* 동의 체크 행 */}
      <label className={`flex cursor-pointer items-center gap-3 border-t px-5 py-3.5 transition-colors rounded-b-[20px] ${
        agreed ? 'border-black bg-black/5' : 'border-[#C9CFDA] hover:bg-gray-50'
      }`}>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
            agreed ? 'border-black bg-black' : 'border-gray-300'
          }`}
        >
          {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </span>
        <span className={`text-sm font-bold ${agreed ? 'text-black' : 'text-gray-500'}`}>
          {title}에 동의합니다
        </span>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgree(e.target.checked)}
          className="sr-only"
        />
      </label>
    </div>
  );
}

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold text-gray-700 mb-0.5">{title}</p>
      <div className="text-gray-500">{children}</div>
    </div>
  );
}

function FindPasswordPanel({ onClose, onModeChange }: PanelProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading || !email) return;
    setIsLoading(true);
    // TODO(BE): POST /api/auth/password/reset-request { email }
    setTimeout(() => {
      setIsLoading(false);
      setSent(true);
    }, 900);
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
        <ArrowLeft className="w-5 h-5 text-gray-400" />
      </button>
      <ModalCloseButton onClose={onClose} />

      {sent ? (
        <>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
            <Check className="w-7 h-7 text-emerald-600" strokeWidth={3} />
          </div>
          <h2 id="find-password-title" className="text-2xl font-bold mb-3 text-center">
            이메일을 확인해주세요
          </h2>
          <p className="text-sm text-gray-500 text-center mb-2 leading-relaxed">
            <span className="font-bold text-gray-900">{email}</span>로
            <br />
            비밀번호 재설정 링크를 보냈어요.
          </p>
          <p className="text-xs text-gray-400 text-center mb-8">
            이메일이 도착하지 않았다면 스팸 메일함을 확인해주세요.
          </p>
          <button
            type="button"
            onClick={() => onModeChange('login')}
            className={`w-full rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus}`}
          >
            로그인으로 돌아가기
          </button>
          <button
            type="button"
            onClick={() => { setSent(false); setEmail(''); }}
            className="mt-3 text-xs font-medium text-gray-400 hover:text-black focus:outline-none focus:underline"
          >
            다른 이메일로 재시도
          </button>
        </>
      ) : (
        <>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C9CFDA] bg-white">
            <Search className="w-6 h-6 text-black" />
          </div>
          <h2 id="find-password-title" className="text-2xl font-bold mb-3 text-center">
            비밀번호 찾기
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
            가입하신 이메일 주소를 입력하시면
            <br />
            비밀번호 재설정 링크를 보내드립니다.
          </p>
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="이메일 주소 입력"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
            <button
              type="submit"
              disabled={isLoading || !email}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus} disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {isLoading ? '전송 중...' : '재설정 링크 보내기'}
            </button>
          </form>
        </>
      )}
    </section>
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
      <X className="w-6 h-6 text-gray-400" />
    </button>
  );
}

function NaverLoginButton({ label }: { label: string }) {
  return (
    <a
      href={NAVER_OAUTH_URL}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#C9CFDA] bg-white py-4 font-bold text-gray-900 transition-all hover:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#03C75A]"
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-md text-sm font-black leading-none"
        style={{ backgroundColor: '#03C75A', color: '#fff' }}
        aria-hidden="true"
      >
        N
      </span>
      {label}
    </a>
  );
}

function SocialDivider() {
  return (
    <div className="flex w-full items-center gap-4 my-6">
      <div className="h-px flex-1 bg-[#C9CFDA]" />
      <span className={`text-xs font-semibold ${hairline.quietText}`}>또는</span>
      <div className="h-px flex-1 bg-[#C9CFDA]" />
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 outline-none transition-all focus:border-black focus:ring-2 focus:ring-black';
