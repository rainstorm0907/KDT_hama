import { ArrowLeft, Search, X } from 'lucide-react';
import { hairline } from '../styles/hairline';

export type AuthMode = 'login' | 'signup' | 'findPassword';

type AuthModalProps = {
  mode: AuthMode | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onLoginSuccess: () => void;
};

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
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
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
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className={`relative flex w-full max-w-md flex-col items-center rounded-[28px] p-10 pointer-events-auto animate-in fade-in zoom-in duration-300 ${hairline.panel}`}
    >
      <ModalCloseButton onClose={onClose} />
      <img src="/hamalogo.png" alt="Hama" className="h-10 mb-8" />
      <h2
        id="login-title"
        className="text-2xl font-bold mb-8 text-center leading-tight"
      >
        반가워요!
        <br />
        다시 로그인할까요?
      </h2>
      <form
        className="w-full space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onLoginSuccess();
        }}
      >
        <input
          type="email"
          placeholder="이메일 주소"
          className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 outline-none transition-all focus:border-black focus:ring-2 focus:ring-black"
        />
        <input
          type="password"
          placeholder="비밀번호"
          className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 outline-none transition-all focus:border-black focus:ring-2 focus:ring-black"
        />
        <div className="flex justify-end px-1">
          <button
            type="button"
            onClick={() => onModeChange('findPassword')}
            className="text-xs font-medium text-gray-400 hover:text-black focus:outline-none focus:underline"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
        <button className={`mt-2 w-full rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus}`}>
          로그인
        </button>
      </form>
      <div className="mt-8 text-sm text-gray-500">
        계정이 없으신가요?
        <button
          type="button"
          onClick={() => onModeChange('signup')}
          className="ml-2 text-black font-bold underline"
        >
          회원가입
        </button>
      </div>
    </section>
  );
}

function SignUpPanel({ onClose, onModeChange }: PanelProps) {
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      className={`relative flex w-full max-w-md flex-col items-center rounded-[28px] p-10 pointer-events-auto animate-in fade-in zoom-in duration-300 ${hairline.panel}`}
    >
      <ModalCloseButton onClose={onClose} />
      <h2
        id="signup-title"
        className="text-2xl font-bold mb-6 text-center leading-tight"
      >
        새로운 시작,
        <br />
        함께해 보세요!
      </h2>
      <form
        className="w-full space-y-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          type="text"
          placeholder="이름"
          className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 outline-none focus:border-black focus:ring-2 focus:ring-black"
        />
        <input
          type="email"
          placeholder="이메일 주소"
          className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 outline-none focus:border-black focus:ring-2 focus:ring-black"
        />
        <input
          type="password"
          placeholder="비밀번호"
          className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 outline-none focus:border-black focus:ring-2 focus:ring-black"
        />
        <button className={`mt-4 w-full rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus}`}>
          시작하기
        </button>
      </form>
      <div className="mt-8 text-sm text-gray-500">
        이미 회원이신가요?
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className="ml-2 text-black font-bold underline"
        >
          로그인
        </button>
      </div>
    </section>
  );
}

function FindPasswordPanel({ onClose, onModeChange }: PanelProps) {
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
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C9CFDA] bg-white">
        <Search className="w-6 h-6 text-black" />
      </div>
      <h2
        id="find-password-title"
        className="text-2xl font-bold mb-3 text-center"
      >
        비밀번호 찾기
      </h2>
      <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
        가입하신 이메일 주소를 입력하시면
        <br />
        비밀번호 재설정 링크를 보내드립니다.
      </p>
      <form
        className="w-full space-y-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          type="email"
          placeholder="이메일 주소 입력"
          className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 outline-none transition-all focus:border-black focus:ring-2 focus:ring-black"
        />
        <button className={`mt-4 w-full rounded-2xl py-4 font-bold transition-all ${hairline.primaryButton} ${hairline.focus}`}>
          재설정 링크 보내기
        </button>
      </form>
    </section>
  );
}

type ModalCloseButtonProps = {
  onClose: () => void;
};

function ModalCloseButton({ onClose }: ModalCloseButtonProps) {
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
