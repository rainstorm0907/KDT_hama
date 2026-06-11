import {
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Eye,
  ListFilter,
  Loader2,
  PackageSearch,
  Search,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { AdminUserRow, AnomalyMode, AnomalyRow } from '../api/adminApi';
import {
  ANOMALY_PAGE_SIZE,
  useAdminUsersQuery,
  useAnomaliesQuery,
  useAnomalySummaryQuery,
} from '../queries/adminQueries';
import { hairline } from '../styles/hairline';
import { formatWon } from '../utils/format';

type MetricTone = 'dark' | 'emerald' | 'amber' | 'rose';

type AdminMetric = {
  label: string;
  value: string;
  description: string;
  trend: string;
  tone: MetricTone;
  icon: LucideIcon;
};

type SearchSignal = {
  keyword: string;
  count: number;
  conversion: string;
  note: string;
};

const searchSignals: SearchSignal[] = [
  {
    keyword: '아이폰',
    count: 184,
    conversion: '찜 22건',
    note: '방문 이후 검색까지 가장 빠름',
  },
  {
    keyword: '갤럭시',
    count: 121,
    conversion: '찜 17건',
    note: '상세 팝업 열람률 높음',
  },
  {
    keyword: '맥북',
    count: 96,
    conversion: '찜 8건',
    note: '가격 이상 후보 동시 증가',
  },
];

const importantTasks = [
  '클러스터 신뢰도 하위 매물부터 분류 결과를 검수',
  '악세서리 의심 매물은 토큰(케이스, 필름 등) 기준으로 확인 후 제외 처리',
  '악세서리 토큰은 config/accessory_tokens.csv에서 추가, 삭제 가능',
];

export function AdminPage() {
  const summaryQuery = useAnomalySummaryQuery();

  const metrics: AdminMetric[] = [
    {
      label: '홈 방문수',
      value: '1,284',
      description: '오늘 00시 이후 메인 진입 (집계 연동 전)',
      trend: '+18.4%',
      tone: 'dark',
      icon: Eye,
    },
    {
      label: '검색 수',
      value: '742',
      description: '검색 API 요청 기준 (집계 연동 전)',
      trend: '+9.1%',
      tone: 'emerald',
      icon: Search,
    },
    {
      label: '클러스터 매물',
      value: '15,394',
      description: '상품명 클러스터에 배정된 매물',
      trend: '전체 45,249',
      tone: 'dark',
      icon: PackageSearch,
    },
    {
      label: '저신뢰 클러스터',
      value: formatCount(summaryQuery.data?.lowConfidence),
      description: '클러스터 신뢰도 0.5 미만 매물',
      trend: '재검수 필요',
      tone: 'amber',
      icon: Database,
    },
    {
      label: '악세서리 의심',
      value: formatCount(summaryQuery.data?.accessory),
      description: '본품 클러스터에 섞인 악세서리 후보',
      trend: '분류 확인',
      tone: 'rose',
      icon: AlertTriangle,
    },
  ];

  return (
    <main className={`flex-1 pb-24 ${hairline.page}`}>
      <section className="mx-auto flex max-w-[1440px] flex-col gap-8 px-8 py-12">
        <AdminHeader />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <section className={`rounded-[28px] p-5 ${hairline.panelSoft}`}>
            <AnomalySection />
          </section>

          <div className="flex flex-col gap-6">
            <ImportantPanel />
            <SearchSignalPanel />
          </div>
        </div>

        <section className={`rounded-[28px] p-5 ${hairline.panelSoft}`}>
          <UserSection />
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
          방문, 검색, 유저, 상품 이상 데이터를 한 화면에서 먼저 훑고 필요한 표로 내려갑니다.
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

function MetricCard({ metric }: { metric: AdminMetric }) {
  const Icon = metric.icon;
  const toneClass = {
    dark: 'bg-[#1D1D1F] text-white',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-600',
  }[metric.tone];
  const trendClass = metric.tone === 'dark' ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#626873]';

  return (
    <article className={`rounded-[24px] p-5 ${hairline.card}`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${trendClass}`}>
          {metric.trend}
        </span>
      </div>
      <p className={`mt-5 text-sm font-black ${hairline.mutedText}`}>{metric.label}</p>
      <p className="mt-1.5 text-3xl font-black tracking-tight text-gray-950">{metric.value}</p>
      <p className={`mt-2 text-xs font-bold ${hairline.quietText}`}>{metric.description}</p>
    </article>
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

function ImportantPanel() {
  return (
    <section className={`rounded-[28px] p-5 ${hairline.panelSoft}`}>
      <SectionTitle
        icon={AlertTriangle}
        title="Important info"
        description="이상데이터 검수 시 우선순위입니다."
      />
      <div className="flex flex-col gap-3">
        {importantTasks.map((task, index) => (
          <div
            key={task}
            className="flex gap-3 rounded-[18px] border border-[#C9CFDA]/86 bg-white/72 px-4 py-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D1D1F] text-xs font-black text-white">
              {index + 1}
            </span>
            <p className="text-sm font-bold leading-6 text-gray-900">{task}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchSignalPanel() {
  return (
    <section className={`rounded-[28px] p-5 ${hairline.panelSoft}`}>
      <SectionTitle
        icon={BarChart3}
        title="검색 흐름"
        description="검색 수와 찜 전환을 같이 봅니다. (집계 연동 전 예시)"
      />
      <div className="flex flex-col gap-3">
        {searchSignals.map((signal) => (
          <article
            key={signal.keyword}
            className="rounded-[18px] border border-[#C9CFDA]/86 bg-white/72 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-black text-gray-950">{signal.keyword}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${hairline.status}`}>
                {signal.count.toLocaleString('ko-KR')}회
              </span>
            </div>
            <p className={`mt-2 text-sm font-black ${hairline.mutedText}`}>{signal.conversion}</p>
            <p className={`mt-1 text-xs font-bold ${hairline.quietText}`}>{signal.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── 이상 데이터 섹션 ────────────────────────────────────────────────

const ANOMALY_TABS: { mode: AnomalyMode; label: string }[] = [
  { mode: 'low_confidence', label: '신뢰도 낮은순' },
  { mode: 'accessory', label: '악세서리 의심' },
];

function AnomalySection() {
  const [mode, setMode] = useState<AnomalyMode>('low_confidence');
  const [page, setPage] = useState(0);
  const anomaliesQuery = useAnomaliesQuery(mode, page);

  const rows = anomaliesQuery.data?.rows ?? [];
  const hasNext = rows.length === ANOMALY_PAGE_SIZE;

  function selectMode(next: AnomalyMode) {
    setMode(next);
    setPage(0);
  }

  return (
    <>
      <SectionTitle
        icon={Database}
        title="이상 데이터 확인"
        description="items의 클러스터 결과를 기준으로 검수 후보를 정렬합니다."
      >
        <div className={`flex shrink-0 items-center gap-1 rounded-[16px] p-1 ${hairline.control}`}>
          {ANOMALY_TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              onClick={() => selectMode(tab.mode)}
              className={`h-9 rounded-[12px] px-3.5 text-sm font-black transition-colors ${hairline.focus} ${
                mode === tab.mode ? 'bg-[#1D1D1F] text-white' : 'text-[#626873] hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SectionTitle>

      {anomaliesQuery.isPending ? (
        <TablePlaceholder label="이상 데이터를 불러오는 중..." />
      ) : anomaliesQuery.isError ? (
        <TablePlaceholder label="이상 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." />
      ) : (
        <>
          <AnomalyTable rows={rows} mode={mode} />
          <Pagination
            page={page}
            hasNext={hasNext}
            isFetching={anomaliesQuery.isFetching}
            onPrev={() => setPage((current) => Math.max(0, current - 1))}
            onNext={() => setPage((current) => current + 1)}
          />
        </>
      )}
    </>
  );
}

function AnomalyTable({ rows, mode }: { rows: AnomalyRow[]; mode: AnomalyMode }) {
  if (rows.length === 0) {
    return <TablePlaceholder label="조건에 맞는 매물이 없습니다." />;
  }

  return (
    <div className="transient-scrollbar overflow-x-auto rounded-[22px] border border-[#C9CFDA]/86 bg-white/64">
      <table className="min-w-[980px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#C9CFDA]/86 text-xs font-black text-[#626873]">
            <th className="px-4 py-3">item</th>
            <th className="px-4 py-3">platform / pid</th>
            <th className="px-4 py-3">상품명 / 클러스터</th>
            <th className="px-4 py-3">가격</th>
            <th className="px-4 py-3">판매 상태</th>
            <th className="px-4 py-3">{mode === 'accessory' ? '매칭 토큰' : '신뢰도'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.itemId} className="border-b border-[#E1E5EC]/80 last:border-b-0">
              <td className="px-4 py-4 align-top">
                <p className="text-sm font-black text-gray-950">#{row.itemId}</p>
              </td>
              <td className="px-4 py-4 align-top">
                <p className="text-sm font-black text-gray-950">{row.platform}</p>
                <p className={`mt-1 text-xs font-bold ${hairline.quietText}`}>{row.pid}</p>
              </td>
              <td className="max-w-[340px] px-4 py-4 align-top">
                <a
                  href={row.link || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="line-clamp-2 text-sm font-black text-gray-950 hover:underline"
                >
                  {row.title}
                </a>
                <p className={`mt-1 line-clamp-1 text-xs font-bold ${hairline.mutedText}`}>
                  {row.clusterName}
                </p>
              </td>
              <td className="px-4 py-4 align-top text-sm font-black text-gray-950">
                {row.price === null ? '—' : formatWon(row.price)}
              </td>
              <td className="px-4 py-4 align-top">
                <StatusBadge label={row.saleStatus || '—'} tone="emerald" />
              </td>
              <td className="px-4 py-4 align-top">
                {mode === 'accessory' ? (
                  <div className="flex max-w-[220px] flex-wrap gap-1.5">
                    {row.matchedTokens.length > 0 ? (
                      row.matchedTokens.map((token) => (
                        <StatusBadge key={token} label={token} tone="rose" />
                      ))
                    ) : (
                      <StatusBadge label="토큰 없음" tone="gray" />
                    )}
                  </div>
                ) : (
                  <ConfidenceBadge value={row.clusterConfidence} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <StatusBadge label="—" tone="gray" />;
  }

  const tone = value < 0.5 ? 'rose' : value < 0.7 ? 'amber' : 'emerald';
  return <StatusBadge label={value.toFixed(2)} tone={tone} />;
}

// ─── 유저 조회 섹션 ──────────────────────────────────────────────────

type UserFilter = '전체' | '관리자' | '탈퇴';

function UserSection() {
  const usersQuery = useAdminUsersQuery();
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<UserFilter>('전체');

  const users = usersQuery.data ?? [];

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
        title="유저 조회"
        description="가입일, 최근 활동, 찜 수를 실시간 데이터로 조회합니다."
      />

      {usersQuery.isPending ? (
        <TablePlaceholder label="유저 목록을 불러오는 중..." />
      ) : usersQuery.isError ? (
        <TablePlaceholder label="유저 목록을 불러오지 못했습니다. 관리자 권한을 확인해주세요." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr]">
          <aside className="rounded-[22px] border border-[#C9CFDA]/86 bg-white/64 p-4">
            <label className="flex h-11 items-center gap-2 rounded-[16px] border border-[#C9CFDA] bg-white px-3">
              <Search className="h-4 w-4 text-[#86868B]" aria-hidden="true" />
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="유저명, 이메일 검색"
                className="w-full bg-transparent text-sm font-bold text-gray-950 outline-none placeholder:font-black placeholder:text-[#86868B]"
              />
            </label>
            <div className="mt-4 grid grid-cols-3 gap-2 xl:grid-cols-1">
              {(['전체', '관리자', '탈퇴'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`flex h-10 items-center justify-between rounded-[15px] px-3 text-sm font-black transition-colors ${hairline.focus} ${
                    filter === item
                      ? hairline.controlActive
                      : `${hairline.control} ${hairline.controlHover}`
                  }`}
                >
                  {item}
                  <ListFilter className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className={`mt-4 text-xs font-bold ${hairline.quietText}`}>
              총 {users.length}명 중 {filtered.length}명 표시
            </p>
          </aside>

          <UserTable users={filtered} />
        </div>
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
            <th className="border-l border-[#E1E5EC]/80 px-4 py-3 text-center">찜</th>
            <th className="px-4 py-3">상태</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId} className="border-b border-[#E1E5EC]/80 last:border-b-0">
              <td className="px-4 py-4">
                <p className="text-sm font-black text-gray-950">{user.nickname}</p>
                <p className={`mt-1 text-xs font-bold ${hairline.quietText}`}>{user.email}</p>
              </td>
              <td className="px-4 py-4 text-sm font-bold text-gray-900">{user.name}</td>
              <td className="px-4 py-4 text-sm font-bold text-gray-900">
                {formatDate(user.joinedAt)}
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center gap-1.5 text-sm font-black text-gray-950">
                  <Clock className="h-4 w-4 text-[#86868B]" aria-hidden="true" />
                  {formatDate(user.lastActiveAt)}
                </span>
              </td>
              <td className="border-l border-[#EEF1F5] px-4 py-4 text-center text-sm font-black text-gray-950">
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
      <p className={`text-xs font-bold ${hairline.quietText}`}>
        {page * ANOMALY_PAGE_SIZE + 1}번째부터 표시
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

function TablePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-[22px] border border-[#C9CFDA]/86 bg-white/64">
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
