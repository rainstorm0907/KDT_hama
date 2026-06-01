import { useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Clock, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hairline } from '../styles/hairline';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from '../utils/recentSearches';

type SearchBarProps = {
  isOpen: boolean;
  initialQuery?: string;
  onOpen: () => void;
  onClose: () => void;
};

// TODO(BE): 로그인 기반 최근 검색어가 필요하면 GET/DELETE /api/users/me/recent-searches로 교체합니다.
// 비로그인 상태는 localStorage에 저장해도 충분합니다.
// TODO(BE): 인기 검색어 API가 생기면 GET /api/search/popular 응답으로 교체합니다.
// 지금은 검색 화면 시연용 기본 랭킹입니다.
const popularKeywords = ['아이폰', '맥북', '갤럭시', '아이패드', '에어팟', '닌텐도'];
const visiblePopularKeywordCount = 4;

export function SearchBar({
  isOpen,
  initialQuery = '',
  onOpen,
  onClose,
}: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [recentKeywords, setRecentKeywords] = useState(() => getRecentSearches());
  const [popularStartIndex, setPopularStartIndex] = useState(0);

  const runSearch = (nextQuery: string) => {
    const trimmedQuery = nextQuery.trim();

    if (!trimmedQuery) {
      return;
    }

    setRecentKeywords(addRecentSearch(trimmedQuery));
    onClose();
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch(query);
  };

  return (
    <section
      role="search"
      aria-label="상품 검색"
      className="relative z-[80] w-full pt-8 pb-0"
    >
      {isOpen ? (
        <div
          className="fixed inset-0 z-[60]"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <div className="max-w-[1440px] mx-auto px-8">
        <div className="w-full max-w-[940px] mx-auto relative">
          <form className="relative z-[75]" onSubmit={handleSubmit}>
            <label htmlFor="main-search" className="sr-only">
              검색어 입력
            </label>
            <div
              className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none"
              aria-hidden="true"
            >
              <Search className="w-5 h-5 text-[#8B919B]" />
            </div>
            <input
              id="main-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={onOpen}
              placeholder="어떤 상품의 최저가를 찾으시나요?"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={isOpen ? 'search-popup' : undefined}
              className="h-[72px] w-full rounded-[25px] border border-[#C6CDD8] bg-white py-0 pl-12 pr-[118px] text-lg font-black text-gray-950 shadow-[0_12px_34px_rgba(29,29,31,0.035),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all placeholder:text-black/36 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              className={`absolute right-2.5 top-1/2 inline-flex h-[50px] min-w-[92px] -translate-y-1/2 items-center justify-center rounded-[18px] px-4 text-[15px] font-black transition-colors ${hairline.primaryButton} ${hairline.focus}`}
            >
              검색
            </button>
          </form>

          <div className="relative z-[70] mt-3 flex items-center justify-center gap-1.5 px-1 pb-1 text-[#8F99A7]">
            <button
              type="button"
              onClick={() =>
                setPopularStartIndex((current) =>
                  current === 0 ? popularKeywords.length - 1 : current - 1
                )
              }
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[#99A3B0] transition hover:bg-white/60 hover:text-[#4E5865] ${hairline.focus}`}
              aria-label="이전 인기 검색어 보기"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 items-center justify-center gap-2.5 text-center text-[12px] font-extrabold text-[#717B89]">
              {getVisiblePopularKeywords(popularStartIndex).map(({ item, index }) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => runSearch(item)}
                  className="shrink-0 rounded-xl px-1.5 py-1 opacity-90 transition hover:bg-white/60 hover:text-[#303845] hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {index + 1}. {item}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setPopularStartIndex((current) => (current + 1) % popularKeywords.length)
              }
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[#99A3B0] transition hover:bg-white/60 hover:text-[#4E5865] ${hairline.focus}`}
              aria-label="다음 인기 검색어 보기"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {isOpen ? (
            <div
              id="search-popup"
              className={`transient-scrollbar absolute left-0 right-0 top-[calc(100%+12px)] z-[85] max-h-[min(360px,calc(100vh-220px))] w-full overflow-y-auto overscroll-contain rounded-[24px] ${hairline.panel}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#8B919B]" aria-hidden="true" />
                    <h3 className="text-sm font-bold tracking-tight text-gray-900">
                      최근 검색어
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecentKeywords(clearRecentSearches())}
                    className="text-xs font-bold text-[#86868B] hover:text-black transition-colors focus:outline-none focus:underline"
                    aria-label="최근 검색어 전체 삭제"
                  >
                    전체 삭제
                  </button>
                </div>
                {recentKeywords.length > 0 ? (
                  <ul className="space-y-1" aria-label="최근 검색어 목록">
                    {recentKeywords.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-4 p-3 hover:bg-white rounded-xl transition-colors"
                      >
                        <Clock
                          className="w-4 h-4 text-gray-400"
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          onClick={() => runSearch(item)}
                          className="text-base font-medium text-gray-700 text-left flex-1 focus:outline-none focus:underline"
                        >
                          {item}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecentKeywords(removeRecentSearch(item))}
                          aria-label={`${item} 검색어 삭제`}
                          className="ml-auto text-gray-300 hover:text-gray-600 transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-2xl bg-white/64 px-4 py-4 text-sm font-bold text-[#86868B]">
                    아직 최근 검색어가 없습니다.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function getVisiblePopularKeywords(startIndex: number) {
  return Array.from({ length: visiblePopularKeywordCount }, (_, offset) => {
    const index = (startIndex + offset) % popularKeywords.length;

    return {
      item: popularKeywords[index],
      index,
    };
  });
}
