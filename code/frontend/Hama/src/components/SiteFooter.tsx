import { Link } from 'react-router-dom';
import { hairline } from '../styles/hairline';

export function SiteFooter() {
  return (
    <footer className="mt-auto w-full border-t border-[#C9CFDA] bg-white/92 py-12">
      <div className="max-w-[1440px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 tracking-wide font-medium">
        <div>© 2026 Eolmaji. All rights reserved.</div>
        <nav
          aria-label="푸터 네비게이션"
          className="grid grid-cols-[auto_auto_4.5rem] items-center gap-6"
        >
          <Link
            to="/terms"
            className={`rounded-full px-1 py-0.5 hover:text-gray-900 transition-colors ${hairline.focus}`}
          >
            이용약관
          </Link>
          <Link
            to="/privacy"
            className={`rounded-full px-1 py-0.5 hover:text-gray-900 transition-colors ${hairline.focus}`}
          >
            개인정보처리방침
          </Link>
          <span aria-hidden="true" className="block h-px w-[4.5rem]" />
        </nav>
      </div>
    </footer>
  );
}
