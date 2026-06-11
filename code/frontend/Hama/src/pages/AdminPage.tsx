import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  Loader2,
  PackageSearch,
  Search,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { AdminUserRow, AnomalyMode, AnomalyRow, AnomalySort } from '../api/adminApi';
import {
  ANOMALY_PAGE_SIZE,
  useAdminUsersQuery,
  useAnomaliesQuery,
  useAnomalySummaryQuery,
} from '../queries/adminQueries';
import { hairline } from '../styles/hairline';
import { formatWon } from '../utils/format';

type AdminTab = 'anomaly' | 'users';

// items 적재 통계 — 적재 파이프라인 산출값 (집계 API 연동 전까지 상수 유지)
const TOTAL_ITEM_COUNT = 45249;
const CLUSTERED_ITEM_COUNT = 15394;

export function AdminPage() {
  const summaryQuery = useAnomalySummaryQuery();
  const usersQuery = useAdminUsersQuery();

  const [tab, setTab] = useState<AdminTab>('anomaly');
  const [anomalyMode, setAnomalyMode] = useState<AnomalyMode>('low_confidence');
  const [anomalySort, setAnomalySort] = useState<AnomalySort>('confidence_asc');
  const [anomalyPage, setAnomalyPage] = useState(0);

  const openAnomalyTab = (mode: AnomalyMode) => {
    setTab('anomaly');
    setAnomalyMode(mode);
    setAnomalySort('confidence_asc');
    setAnomalyPage(0);
  };

  return (
    <main className={`flex-1 pb-24 ${hairline.page}`}>
      <section className="mx-auto flex max-w-[1440px] flex-col gap-8 px-8 py-12">
        <AdminHeader />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Database}
            label="전체 매물"
            value={TOTAL_ITEM_COUNT.toLocaleString('ko-KR')}
            description="items 테이블 적재 기준"
          />
          <MetricCard
            icon={PackageSearch}
            label="클러스터 배정"
            value={CLUSTERED_ITEM_COUNT.toLocaleString('ko-KR')}
            description="상품명 클러스터에 배정된 매물"
          />
          <MetricCard
            icon={AlertTriangle}
            label="저신뢰 클러스터"
            value={formatCount(summaryQuery.data?.lowConfidence)}
            description="클러스터 신뢰도 0.5 미만"
            tone="amber"
            actionLabel="바로 검수"
            onClick={() => openAnomalyTab('low_confidence')}
          />
          <MetricCard
            icon={AlertTriangle}
            label="악세서리 의심"
            value={formatCount(summaryQuery.data?.accessory)}
            description="본품 클러스터에 섞인 악세서리 후보"
            tone="rose"
            actionLabel="바로 검수"
            onClick={() => openAnomalyTab('accessory')}
          />
        </div>

        <div
          role="tablist"
          aria-label="관리자 메뉴"
          className={`flex w-fit items-center gap-1 rounded-[18px] p-1 ${hairline.control}`}
        >
          <AdminTabButton
            icon={Database}
            label="이상 데이터"
            isActive={tab === 'anomaly'}
            onClick={() => setTab('anomaly')}
          />
          <AdminTabButton
            icon={UsersRound}
            label="유저 관리"
            badge={usersQuery.data ? usersQuery.data.length.toLocaleString('ko-KR') : undefined}
            isActive={tab === 'users'}
            onClick={() => setTab('users')}
          />
        </div>

        <section
          role="tabpanel"
          className={`rounded-[28px] p-5 md:p-6 ${hairline.panelSoft}`}
        >
          {tab === 'anomaly' ? (
            <AnomalySection
              mode={anomalyMode}
              sort={anomalySort}
              page={anomalyPage}
              onModeChange={(mode) => {
                setAnomalyMode(mode);
                setAnomalySort('confidence_asc');
                setAnomalyPage(0);
              }}
              onSortChange={(sort) => {
                setAnomalySort(sort);
                setAnomalyPage(0);
              }}
              onPageChange={setAnomalyPage}
            />
          ) : (
            <UserSection usersQuery={usersQuery} />
          )}
        </section>
      </section>
    </main>
  );
}

function formatCount(value: number | undefined): string {
  return value === undefined ? '—' : value.toLocaleString('ko-KR');
}

function AdminHeader() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className={`text-sm font-black ${hairline.quietText}`}>Hama Admin</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 md:text-[34px]">
          운영 대시보드
        </h1>
        <p className={`mt-3 max-w-2xl text-base font-semibold ${hairline.mutedText}`}>
          매물 분류 품질을 점검하고 유저 현황을 한 곳에서 확인합니다.
        </p>
      </div>
      <div className={`flex flex-wrap items-center gap-2 rounded-[22px] px-4 py-3 ${hairline.card}`}>
        <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        <span className="text-sm font-black text-gray-950">관리자 전용</span>
        <span className={`text-xs font-black ${hairline.quietText}`}>실시간 데이터 연동</span>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone = 'dark',
  actionLabel,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
  tone?: 'dark' | 'amber' | 'rose';
  actionLabel?: string;
  onClick?: () => void;
}) {
  const iconClass = {
    dark: 'bg-[#1D1D1F] text-white',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-600',
  }[tone];

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {actionLabel ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-white px-3 py-1 text-xs font-black text-[#626873] transition-colors group-hover:text-gray-950">
            {actionLabel}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className={`mt-5 text-sm font-black ${hairline.mutedText}`}>{label}</p>
      <p className="mt-1.5 text-3xl font-black tracking-tight text-gray-950">{value}</p>
      <p className={`mt-2 text-xs font-bold ${hairline.quietText}`}>{description}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group rounded-[24px] p-5 text-left transition ${hairline.card} ${hairline.cardHover} ${hairline.focus}`}
      >
        {body}
      </button>
    );
  }

  return <article className={`rounded-[24px] p-5 ${hairline.card}`}>{body}</article>;
}

function AdminTabButton({
  icon: Icon,
  label,
  badge,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  badge?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-[14px] px-5 text-sm font-black transition-colors ${hairline.focus} ${
        isActive ? 'bg-[#1D1D1F] text-white' : 'text-[#626873] hover:text-black'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
      {badge ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
            isActive ? 'bg-white/16 text-white' : 'bg-[#EEF1F5] text-[#626873]'
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${hairline.control}`}>
          <Icon className="h-5 w-5 text-[#626873]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-tight text-gray-950">{title}</h2>
          <p className={`mt-1 text-sm font-semibold ${hairline.mutedText}`}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── 이상 데이터 탭 ────────────────────────────────────────────────

const ANOMALY_TABS: { mode: AnomalyMode; label: string }[] = [
  { mode: 'low_confidence', label: '신뢰도 낮은순' },
  { mode: 'accessory', label: '악세서리 의심' },
];

const ANOMALY_GUIDE: Record<AnomalyMode, string> = {
  low_confidence: '신뢰도가 낮은 매물부터 클러스터 분류가 맞는지 확인하세요.',
  accessory:
    '매칭 토큰을 확인해 본품 클러스터에 섞인 악세서리를 가려내세요. 토큰은 config/accessory_tokens.csv에서 관리합니다.',
};

function AnomalySection({
  mode,
  sort,
  page,
  onModeChange,
  onSortChange,
  onPageChange,
}: {
  mode: AnomalyMode;
  sort: AnomalySort;
  page: number;
  onModeChange: (mode: AnomalyMode) => void;
  onSortChange: (sort: AnomalySort) => void;
  onPageChange: (page: number) => void;
}) {
  const anomaliesQuery = useAnomaliesQuery(mode, sort, page);

  const rows = anomaliesQuery.data?.rows ?? [];
  const hasNext = rows.length === ANOMALY_PAGE_SIZE;

  return (
    <>
      <SectionTitle
        icon={Database}
        title="이상 데이터 검수"
        description={ANOMALY_GUIDE[mode]}
      >
        <div className={`flex shrink-0 items-center gap-1 rounded-[16px] p-1 ${hairline.control}`}>
          {ANOMALY_TABS.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onModeChange(item.mode)}
              aria-pressed={mode === item.mode}
              className={`h-9 rounded-[12px] px-3.5 text-sm font-black transition-colors ${hairline.focus} ${
                mode === item.mode ? 'bg-[#1D1D1F] text-white' : 'text-[#626873] hover:text-black'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </SectionTitle>

      {anomaliesQuery.isPending ? (
        <TablePlaceholder label="이상 데이터를 불러오는 중..." isLoading />
      ) : anomaliesQuery.isError ? (
        <TablePlaceholder label="이상 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." />
      ) : (
        <>
          <AnomalyTable rows={rows} mode={mode} sort={sort} onSortChange={onSortChange} />
          <Pagination
            page={page}
            hasNext={hasNext}
            isFetching={anomaliesQuery.isFetching}
            onPrev={() => onPageChange(Math.max(0, page - 1))}
            onNext={() => onPageChange(page + 1)}
          />
        </>
      )}
    </>
  );
}

function AnomalyTable({
  rows,
  mode,
  sort,
  onSortChange,
}: {
  rows: AnomalyRow[];
  mode: AnomalyMode;
  sort: AnomalySort;
  onSortChange: (sort: AnomalySort) => void;
}) {
  if (rows.length === 0) {
    return <TablePlaceholder label="조건에 맞는 매물이 없습니다." />;
  }

  return (
    <div className="transient-scrollbar overflow-x-auto rounded-[22px] border border-[#C9CFDA]/86 bg-white/64">
      <table className="min-w-[920px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#C9CFDA]/86 text-xs font-black text-[#626873]">
            <th className="px-4 py-3">매물</th>
            <th className="px-4 py-3">상품명 / 클러스터</th>
            <SortableHeader
              label="가격"
              columnKey="price"
              sort={sort}
              onSortChange={onSortChange}
              align="right"
            />
            {mode === 'accessory' ? (
              <th className="px-4 py-3">매칭 토큰</th>
            ) : (
              <SortableHeader
                label="신뢰도"
                columnKey="confidence"
                sort={sort}
                onSortChange={onSortChange}
              />
            )}
            <th className="px-4 py-3">상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.itemId}
              className="border-b border-[#E1E5EC]/80 transition-colors last:border-b-0 hover:bg-white/85"
            >
              <td className="w-[150px] px-4 py-4 align-top">
                <p className="text-sm font-black text-gray-950">#{row.itemId}</p>
                <p className={`mt-1 text-xs font-bold ${hairline.quietText}`}>
                  {row.platform} · {row.pid}
                </p>
              </td>
              <td className="max-w-[420px] px-4 py-4 align-top">
                <a
                  href={row.link || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`group inline-flex max-w-full items-baseline gap-1.5 ${hairline.focus}`}
                >
                  <span className="line-clamp-2 text-sm font-black text-gray-950 group-hover:underline">
                    {row.title}
                  </span>
                  <ExternalLink
                    className="h-3.5 w-3.5 shrink-0 self-center text-[#9AA2AF] opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </a>
                <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#C9CFDA]/86 bg-white px-2.5 py-0.5">
                  <PackageSearch className="h-3 w-3 shrink-0 text-[#86868B]" aria-hidden="true" />
                  <span className={`truncate text-xs font-bold ${hairline.mutedText}`}>
                    {row.clusterName || '클러스터 없음'}
                  </span>
                </span>
              </td>
              <td className="w-[130px] px-4 py-4 text-right align-top text-sm font-black text-gray-950">
                {row.price === null ? '—' : formatWon(row.price)}
              </td>
              <td className="w-[200px] px-4 py-4 align-top">
                {mode === 'accessory' ? (
                  <div className="flex max-w-[200px] flex-wrap gap-1.5">
                    {row.matchedTokens.length > 0 ? (
                      row.matchedTokens.map((token) => (
                        <StatusBadge key={token} label={token} tone="rose" />
                      ))
                    ) : (
                      <StatusBadge label="토큰 없음" tone="gray" />
                    )}
                  </div>
                ) : (
                  <ConfidenceCell value={row.clusterConfidence} />
                )}
              </td>
              <td className="w-[110px] px-4 py-4 align-top">
                <StatusBadge label={row.saleStatus || '—'} tone="emerald" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  label,
  columnKey,
  sort,
  onSortChange,
  align = 'left',
}: {
  label: string;
  columnKey: 'price' | 'confidence';
  sort: AnomalySort;
  onSortChange: (sort: AnomalySort) => void;
  align?: 'left' | 'right';
}) {
  const isActive = sort.startsWith(`${columnKey}_`);
  const direction = isActive ? (sort.endsWith('_desc') ? 'desc' : 'asc') : null;
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;
  const nextSort: AnomalySort = `${columnKey}_${direction === 'asc' ? 'desc' : 'asc'}`;

  return (
    <th
      className={`px-4 py-2 ${align === 'right' ? 'text-right' : ''}`}
      aria-sort={direction === null ? 'none' : direction === 'asc' ? 'ascending' : 'descending'}
    >
      <button
        type="button"
        onClick={() => onSortChange(nextSort)}
        aria-label={`${label} ${direction === 'asc' ? '내림차순' : '오름차순'} 정렬`}
        className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2 text-xs font-black transition-colors ${hairline.focus} ${
          isActive ? 'bg-[#1D1D1F] text-white' : 'text-[#626873] hover:bg-white hover:text-gray-950'
        }`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

function ConfidenceCell({ value }: { value: number | null }) {
  if (value === null) {
    return <StatusBadge label="—" tone="gray" />;
  }

  const tone = value < 0.5 ? 'rose' : value < 0.7 ? 'amber' : 'emerald';
  const barClass = {
    rose: 'bg-rose-500/85',
    amber: 'bg-amber-500/85',
    emerald: 'bg-emerald-500/85',
  }[tone];
  const textClass = {
    rose: 'text-rose-600',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
  }[tone];

  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-9 text-sm font-black tabular-nums ${textClass}`}>{value.toFixed(2)}</span>
      <span
        role="img"
        aria-label={`클러스터 신뢰도 ${Math.round(value * 100)}%`}
        className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E5E9F0]"
      >
        <span
          className={`block h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(100, Math.max(4, Math.round(value * 100)))}%` }}
        />
      </span>
    </div>
  );
}

// ─── 유저 관리 탭 ──────────────────────────────────────────────────

type UserFilter = '전체' | '관리자' | '탈퇴';

function UserSection({
  usersQuery,
}: {
  usersQuery: ReturnType<typeof useAdminUsersQuery>;
}) {
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<UserFilter>('전체');

  const users = usersQuery.data ?? [];

  const counts = useMemo(
    () => ({
      전체: users.length,
      관리자: users.filter((user) => user.role === 'ADMIN').length,
      탈퇴: users.filter((user) => user.accountStatus === 'WITHDRAWN').length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    const trimmed = keyword.trim().toLowerCase();
    return users.filter((user) => {
      if (filter === '관리자' && user.role !== 'ADMIN') return false;
      if (filter === '탈퇴' && user.accountStatus !== 'WITHDRAWN') return false;
      if (!trimmed) return true;
      return [user.name, user.nickname, user.email]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(trimmed));
    });
  }, [users, keyword, filter]);

  return (
    <>
      <SectionTitle
        icon={UsersRound}
        title="유저 관리"
        description="가입일, 최근 활동, 찜 수를 실시간 데이터로 조회합니다."
      />

      {usersQuery.isPending ? (
        <TablePlaceholder label="유저 목록을 불러오는 중..." isLoading />
      ) : usersQuery.isError ? (
        <TablePlaceholder label="유저 목록을 불러오지 못했습니다. 관리자 권한을 확인해주세요." />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex h-11 w-full max-w-md items-center gap-2 rounded-[16px] border border-[#C9CFDA] bg-white px-3 focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2">
              <Search className="h-4 w-4 shrink-0 text-[#86868B]" aria-hidden="true" />
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="유저명, 이메일 검색"
                aria-label="유저 검색"
                className="w-full bg-transparent text-sm font-bold text-gray-950 outline-none placeholder:font-black placeholder:text-[#86868B]"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {(['전체', '관리자', '탈퇴'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={`inline-flex h-10 items-center gap-2 rounded-[15px] px-4 text-sm font-black transition-colors ${hairline.focus} ${
                    filter === item
                      ? hairline.controlActive
                      : `${hairline.control} ${hairline.controlHover}`
                  }`}
                >
                  {item}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                      filter === item ? 'bg-[#1D1D1F] text-white' : 'bg-[#EEF1F5] text-[#626873]'
                    }`}
                  >
                    {counts[item].toLocaleString('ko-KR')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <UserTable users={filtered} />

          <p className={`mt-4 text-xs font-bold ${hairline.quietText}`}>
            총 {users.length.toLocaleString('ko-KR')}명 중 {filtered.length.toLocaleString('ko-KR')}명
            표시
          </p>
        </>
      )}
    </>
  );
}

function UserTable({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return <TablePlaceholder label="조건에 맞는 유저가 없습니다." />;
  }

  return (
    <div className="transient-scrollbar overflow-x-auto rounded-[22px] border border-[#C9CFDA]/86 bg-white/64">
      <table className="min-w-[840px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#C9CFDA]/86 text-xs font-black text-[#626873]">
            <th className="px-4 py-3">유저</th>
            <th className="px-4 py-3">이름</th>
            <th className="px-4 py-3">가입일</th>
            <th className="px-4 py-3">최근 활동</th>
            <th className="px-4 py-3 text-center">찜</th>
            <th className="px-4 py-3">상태</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.userId}
              className="border-b border-[#E1E5EC]/80 transition-colors last:border-b-0 hover:bg-white/85"
            >
              <td className="px-4 py-4">
                <p className="text-sm font-black text-gray-950">{user.nickname}</p>
                <p className={`mt-1 text-xs font-bold ${hairline.quietText}`}>{user.email}</p>
              </td>
              <td className="px-4 py-4 text-sm font-bold text-gray-900">{user.name}</td>
              <td className="px-4 py-4 text-sm font-bold tabular-nums text-gray-900">
                {formatDate(user.joinedAt)}
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center gap-1.5 text-sm font-black tabular-nums text-gray-950">
                  <Clock className="h-4 w-4 text-[#86868B]" aria-hidden="true" />
                  {formatDate(user.lastActiveAt)}
                </span>
              </td>
              <td className="px-4 py-4 text-center text-sm font-black tabular-nums text-gray-950">
                {user.wishlistCount.toLocaleString('ko-KR')}
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge
                    label={user.accountStatus === 'WITHDRAWN' ? '탈퇴' : '정상'}
                    tone={user.accountStatus === 'WITHDRAWN' ? 'gray' : 'emerald'}
                  />
                  {user.role === 'ADMIN' && <StatusBadge label="관리자" tone="amber" />}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 공용 컴포넌트 ──────────────────────────────────────────────────

function Pagination({
  page,
  hasNext,
  isFetching,
  onPrev,
  onNext,
}: {
  page: number;
  hasNext: boolean;
  isFetching: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className={`text-xs font-bold tabular-nums ${hairline.quietText}`}>
        {page + 1}페이지 · {page * ANOMALY_PAGE_SIZE + 1}번째부터 표시
      </p>
      <div className="flex items-center gap-2">
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-[#86868B]" aria-hidden="true" />}
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 0}
          className={`h-9 rounded-[14px] px-4 text-sm font-black ${hairline.secondaryButton} ${hairline.focus} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          이전
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className={`h-9 rounded-[14px] px-4 text-sm font-black ${hairline.secondaryButton} ${hairline.focus} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          다음
        </button>
      </div>
    </div>
  );
}

function TablePlaceholder({ label, isLoading = false }: { label: string; isLoading?: boolean }) {
  return (
    <div className="flex h-40 items-center justify-center gap-2.5 rounded-[22px] border border-[#C9CFDA]/86 bg-white/64">
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#86868B]" aria-hidden="true" />}
      <p className={`text-sm font-bold ${hairline.mutedText}`}>{label}</p>
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'emerald' | 'amber' | 'rose' | 'gray';
}) {
  const toneClass = {
    emerald: 'border-emerald-200/80 bg-emerald-50/70 text-emerald-700/85',
    amber: 'border-amber-200/80 bg-amber-50/80 text-amber-700',
    rose: 'border-rose-200/80 bg-rose-50/80 text-rose-600',
    gray: 'border-[#C9CFDA]/86 bg-white text-[#626873]',
  }[tone];

  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black ${toneClass}`}>
      {label}
    </span>
  );
}

export default AdminPage;
