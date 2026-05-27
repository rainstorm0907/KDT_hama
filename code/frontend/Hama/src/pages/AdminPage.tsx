import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Clock,
  Database,
  Eye,
  ListFilter,
  PackageSearch,
  Search,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
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

type AdminUser = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  lastActive: string;
  wishlistCount: number;
  searchCount: number;
  status: '정상' | '확인 필요';
};

type AnomalyItem = {
  itemId: string;
  platform: string;
  pid: string;
  productName: string;
  category: string;
  price: number;
  saleStatus: string;
  matchState: '미매칭' | '가격 이상' | '상태 확인';
  reason: string;
  updatedAt: string;
};

type SearchSignal = {
  keyword: string;
  count: number;
  conversion: string;
  note: string;
};

const adminMetrics: AdminMetric[] = [
  {
    label: '홈 방문수',
    value: '1,284',
    description: '오늘 00시 이후 메인 진입',
    trend: '+18.4%',
    tone: 'dark',
    icon: Eye,
  },
  {
    label: '검색 수',
    value: '742',
    description: '검색 API 요청 기준',
    trend: '+9.1%',
    tone: 'emerald',
    icon: Search,
  },
  {
    label: '미매칭 상품',
    value: '36',
    description: '상품명 매칭 실패 item',
    trend: '우선 확인',
    tone: 'amber',
    icon: PackageSearch,
  },
  {
    label: '판별결과 이상',
    value: '9',
    description: '분류, 매칭 판별 재검토',
    trend: '재판별 필요',
    tone: 'amber',
    icon: Database,
  },
  {
    label: '이상 데이터',
    value: '12',
    description: '가격, 상태, 컬럼 누락 후보',
    trend: '4건 긴급',
    tone: 'rose',
    icon: AlertTriangle,
  },
];

const adminUsers: AdminUser[] = [
  {
    id: 'U-1024',
    name: '김하마',
    email: 'hama.user@example.com',
    joinedAt: '2026.05.18',
    lastActive: '방금 전',
    wishlistCount: 14,
    searchCount: 48,
    status: '정상',
  },
  {
    id: 'U-1018',
    name: '부트캠프팀',
    email: 'team.demo@example.com',
    joinedAt: '2026.05.15',
    lastActive: '12분 전',
    wishlistCount: 6,
    searchCount: 31,
    status: '정상',
  },
  {
    id: 'U-1007',
    name: '테스트계정',
    email: 'test.local@example.com',
    joinedAt: '2026.05.10',
    lastActive: '어제',
    wishlistCount: 0,
    searchCount: 3,
    status: '확인 필요',
  },
];

const anomalyItems: AnomalyItem[] = [
  {
    itemId: 'ITEM-4092',
    platform: '번개장터',
    pid: '406591981',
    productName: '[00866] 당일발송 갤럭시S25울트라 S938 512GB 무잔상 블랙',
    category: '갤럭시 s25',
    price: 1070000,
    saleStatus: '판매중',
    matchState: '미매칭',
    reason: '상품명 토큰이 기존 정규화 규칙과 맞지 않음',
    updatedAt: '오전 01:20',
  },
  {
    itemId: 'ITEM-3987',
    platform: '중고나라',
    pid: 'N-889120',
    productName: '맥북프로 m3 풀박스 급처',
    category: '맥북',
    price: 12000,
    saleStatus: '판매중',
    matchState: '가격 이상',
    reason: '동일 카테고리 평균 대비 95% 낮음',
    updatedAt: '오전 01:08',
  },
  {
    itemId: 'ITEM-3771',
    platform: '번개장터',
    pid: '404955502',
    productName: '[2개] 아이폰16플러스 애플 정품 클리어 케이스 맥세이프 미개봉',
    category: '아이폰 16',
    price: 56300,
    saleStatus: '예약중',
    matchState: '상태 확인',
    reason: '상세 API와 목록 API의 판매 상태가 다름',
    updatedAt: '오전 00:52',
  },
];

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
  '상품명 매칭 실패 item 36건 중 가격 정보 있는 항목부터 확인',
  '검색 수 급증 키워드와 이상 데이터 후보를 같은 시간대 기준으로 비교',
  '유저 조회 API 연결 시 최근 검색, 찜 목록 수를 같은 행에서 볼 수 있게 유지',
];

export function AdminPage() {
  return (
    <main className={`flex-1 pb-24 ${hairline.page}`}>
      <section className="mx-auto flex max-w-[1440px] flex-col gap-8 px-8 py-12">
        <AdminHeader />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {adminMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <section className={`rounded-[28px] p-5 ${hairline.panelSoft}`}>
            <SectionTitle
              icon={Database}
              title="이상 데이터 확인"
              description="백엔드가 item 컬럼을 내려주면 이 표의 행만 API 응답으로 교체합니다."
              action="item 전체 컬럼"
            />
            <AnomalyTable />
          </section>

          <div className="flex flex-col gap-6">
            <ImportantPanel />
            <SearchSignalPanel />
          </div>
        </div>

        <section className={`rounded-[28px] p-5 ${hairline.panelSoft}`}>
          <SectionTitle
            icon={UsersRound}
            title="유저 조회"
            description="가입일, 최근 활동, 찜 수와 검색 수를 나눠 비교합니다."
            action="조회 기준"
          />
          <UserTable />
        </section>
      </section>
    </main>
  );
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
        <span className="text-sm font-black text-gray-950">로컬 관리자 화면</span>
        <span className={`text-xs font-black ${hairline.quietText}`}>API 연결 전 UI 계약</span>
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
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
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
      <button
        type="button"
        className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-black ${hairline.secondaryButton} ${hairline.focus}`}
      >
        <ListFilter className="h-4 w-4" aria-hidden="true" />
        {action}
      </button>
    </div>
  );
}

function ImportantPanel() {
  return (
    <section className={`rounded-[28px] p-5 ${hairline.panelSoft}`}>
      <SectionTitle
        icon={AlertTriangle}
        title="Important info"
        description="발표나 시연 때 바로 설명 가능한 운영 우선순위입니다."
        action="우선순위"
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
        description="검색 수와 찜 전환을 같이 봅니다."
        action="오늘"
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

function AnomalyTable() {
  return (
    <div className="transient-scrollbar overflow-x-auto rounded-[22px] border border-[#C9CFDA]/86 bg-white/64">
      <table className="min-w-[980px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#C9CFDA]/86 text-xs font-black text-[#626873]">
            <th className="px-4 py-3">item</th>
            <th className="px-4 py-3">platform / pid</th>
            <th className="px-4 py-3">상품명</th>
            <th className="px-4 py-3">가격</th>
            <th className="px-4 py-3">판매 상태</th>
            <th className="px-4 py-3">확인 사유</th>
          </tr>
        </thead>
        <tbody>
          {anomalyItems.map((item) => (
            <tr key={item.itemId} className="border-b border-[#E1E5EC]/80 last:border-b-0">
              <td className="px-4 py-4 align-top">
                <p className="text-sm font-black text-gray-950">{item.itemId}</p>
                <p className={`mt-1 text-xs font-bold ${hairline.quietText}`}>{item.updatedAt}</p>
              </td>
              <td className="px-4 py-4 align-top">
                <p className="text-sm font-black text-gray-950">{item.platform}</p>
                <p className={`mt-1 text-xs font-bold ${hairline.quietText}`}>{item.pid}</p>
              </td>
              <td className="max-w-[320px] px-4 py-4 align-top">
                <p className="line-clamp-2 text-sm font-black text-gray-950">{item.productName}</p>
                <p className={`mt-1 text-xs font-bold ${hairline.mutedText}`}>{item.category}</p>
              </td>
              <td className="px-4 py-4 align-top text-sm font-black text-gray-950">
                {formatWon(item.price)}
              </td>
              <td className="px-4 py-4 align-top">
                <StatusBadge label={item.saleStatus} tone="emerald" />
              </td>
              <td className="px-4 py-4 align-top">
                <div className="flex max-w-[260px] flex-col gap-2">
                  <StatusBadge label={item.matchState} tone={item.matchState === '미매칭' ? 'amber' : item.matchState === '가격 이상' ? 'rose' : 'gray'} />
                  <p className={`text-xs font-bold leading-5 ${hairline.mutedText}`}>{item.reason}</p>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserTable() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr]">
      <aside className="rounded-[22px] border border-[#C9CFDA]/86 bg-white/64 p-4">
        <div className="flex h-11 items-center gap-2 rounded-[16px] border border-[#C9CFDA] bg-white px-3">
          <Search className="h-4 w-4 text-[#86868B]" aria-hidden="true" />
          <span className={`text-sm font-black ${hairline.quietText}`}>유저명, 이메일 검색</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1">
          {['전체', '최근 활동', '확인 필요'].map((filter, index) => (
            <button
              key={filter}
              type="button"
              className={`flex h-10 items-center justify-between rounded-[15px] px-3 text-sm font-black transition-colors ${hairline.focus} ${
                index === 0 ? hairline.controlActive : `${hairline.control} ${hairline.controlHover}`
              }`}
            >
              {filter}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>
      </aside>

      <div className="transient-scrollbar overflow-x-auto rounded-[22px] border border-[#C9CFDA]/86 bg-white/64">
        <table className="min-w-[840px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#C9CFDA]/86 text-xs font-black text-[#626873]">
              <th className="px-4 py-3">유저</th>
              <th className="px-4 py-3">가입일</th>
              <th className="px-4 py-3">최근 활동</th>
              <th className="border-l border-[#E1E5EC]/80 px-4 py-3 text-center">찜</th>
              <th className="border-l border-[#E1E5EC]/80 px-4 py-3 text-center">검색</th>
              <th className="px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {adminUsers.map((user) => (
              <tr key={user.id} className="border-b border-[#E1E5EC]/80 last:border-b-0">
                <td className="px-4 py-4">
                  <p className="text-sm font-black text-gray-950">{user.name}</p>
                  <p className={`mt-1 text-xs font-bold ${hairline.quietText}`}>{user.email}</p>
                </td>
                <td className="px-4 py-4 text-sm font-bold text-gray-900">{user.joinedAt}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-black text-gray-950">
                    <Clock className="h-4 w-4 text-[#86868B]" aria-hidden="true" />
                    {user.lastActive}
                  </span>
                </td>
                <td className="border-l border-[#EEF1F5] px-4 py-4 text-center text-sm font-black text-gray-950">
                  {user.wishlistCount.toLocaleString('ko-KR')}
                </td>
                <td className="border-l border-[#EEF1F5] px-4 py-4 text-center text-sm font-black text-gray-950">
                  {user.searchCount.toLocaleString('ko-KR')}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge label={user.status} tone={user.status === '정상' ? 'emerald' : 'amber'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
