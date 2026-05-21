import { Link, useNavigate } from 'react-router-dom';
import { hairline } from '../styles/hairline';
import type { AuthMode } from './AuthModal';

type HeaderProps = {
  isLoggedIn: boolean;
  onAuthOpen: (mode: AuthMode) => void;
  onLogout: () => void;
};

export function Header({ isLoggedIn, onAuthOpen, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const secondaryButtonClass = `inline-flex h-12 w-[112px] items-center justify-center rounded-[18px] text-base font-black transition-colors ${hairline.secondaryButton} ${hairline.focus}`;
  const primaryButtonClass = `inline-flex h-12 w-[112px] items-center justify-center rounded-[18px] text-base font-black transition-colors ${hairline.primaryButton} ${hairline.focus}`;

  return (
    <header className={hairline.header}>
      <div className="max-w-[1440px] mx-auto flex items-center justify-between h-20 px-8">
        <Link
          to="/"
          className={`flex-shrink-0 cursor-pointer rounded-xl ${hairline.focusWide}`}
          aria-label="얼마지 메인으로 가기"
        >
          <img
            src="/hamalogo.png"
            alt=""
            className="h-11 w-auto object-contain"
          />
        </Link>
        <nav
          aria-label="메인 네비게이션"
          className="grid w-[240px] grid-cols-2 gap-4"
        >
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/mypage')}
                className={primaryButtonClass}
              >
                프로필
              </button>
              <button
                type="button"
                onClick={onLogout}
                className={secondaryButtonClass}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onAuthOpen('login')}
                className={primaryButtonClass}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => onAuthOpen('signup')}
                className={secondaryButtonClass}
              >
                회원가입
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
