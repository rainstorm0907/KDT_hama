import { Link } from 'react-router-dom';
import { hairline } from '../styles/hairline';

type LegalPageProps = {
  type: 'terms' | 'privacy';
};

const legalContent = {
  terms: {
    title: '이용약관',
    description: '얼마지 서비스 이용에 필요한 기본 약관입니다.',
    sections: [
      {
        heading: '서비스 이용',
        body: '얼마지는 중고 상품 검색, 가격 비교, 상품 상세 정보 확인을 돕는 서비스입니다. 사용자는 관계 법령과 서비스 운영 기준을 지켜야 합니다.',
      },
      {
        heading: '상품 정보',
        body: '상품 가격, 이미지, 설명, 판매 상태는 각 플랫폼과 백엔드 데이터 상태에 따라 달라질 수 있습니다. 실제 거래 전에는 원본 판매 페이지에서 정보를 다시 확인해야 합니다.',
      },
      {
        heading: '책임 범위',
        body: '얼마지는 상품 탐색을 돕는 도구이며, 사용자와 판매자 사이의 거래 성사, 결제, 배송, 환불 과정에 직접 관여하지 않습니다.',
      },
    ],
  },
  privacy: {
    title: '개인정보처리방침',
    description: '얼마지가 개인정보를 다루는 기본 원칙입니다.',
    sections: [
      {
        heading: '수집 항목',
        body: '회원 기능을 사용하는 경우 로그인 식별 정보, 찜한 상품, 알림 설정 등 서비스 제공에 필요한 최소 정보를 저장할 수 있습니다.',
      },
      {
        heading: '이용 목적',
        body: '수집된 정보는 로그인 유지, 찜 목록 관리, 상품 알림 제공, 서비스 품질 개선을 위해 사용됩니다.',
      },
      {
        heading: '보관과 보호',
        body: '개인정보는 필요한 기간 동안만 보관하며, 프로젝트 운영 기준에 따라 외부에 임의로 제공하지 않습니다.',
      },
    ],
  },
} as const;

export function LegalPage({ type }: LegalPageProps) {
  const content = legalContent[type];

  return (
    <main className={`flex-1 px-6 py-16 ${hairline.page}`}>
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className={`rounded-[28px] p-8 md:p-10 ${hairline.panelSoft}`}>
          <p className={`text-sm font-bold ${hairline.quietText}`}>Hama</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">
            {content.title}
          </h1>
          <p className={`mt-4 text-base font-semibold leading-7 ${hairline.mutedText}`}>
            {content.description}
          </p>
        </div>

        <div className={`rounded-[28px] p-8 md:p-10 ${hairline.card}`}>
          <div className="divide-y divide-[#D8DDE6]">
            {content.sections.map((section) => (
              <section key={section.heading} className="py-7 first:pt-0 last:pb-0">
                <h2 className="text-lg font-black text-gray-950">{section.heading}</h2>
                <p className={`mt-3 text-sm font-semibold leading-7 ${hairline.mutedText}`}>
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>

        <Link
          to="/"
          className={`self-start rounded-full px-5 py-3 text-sm font-black transition-colors ${hairline.secondaryButton} ${hairline.focus}`}
        >
          메인으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
