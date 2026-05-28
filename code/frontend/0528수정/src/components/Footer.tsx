export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-[#C9CFDA] bg-white/92 py-12">
      <div className="max-w-[1440px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 tracking-wide font-medium">
        <div>© 2026 Eolmaji. All rights reserved.</div>
        <nav aria-label="푸터 네비게이션" className="flex gap-6">
          <a
            href="#terms"
            className="hover:text-gray-900 transition-colors focus:outline-none focus:underline"
          >
            이용약관
          </a>
          <a
            href="#privacy"
            className="hover:text-gray-900 transition-colors focus:outline-none focus:underline"
          >
            개인정보처리방침
          </a>
          <a
            href="#help"
            className="hover:text-gray-900 transition-colors focus:outline-none focus:underline"
          >
            고객센터
          </a>
        </nav>
      </div>
    </footer>
  );
}
