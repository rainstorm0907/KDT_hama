export type ProductStatus = '판매중' | '예약중' | '판매완료';

export type PricePoint = {
  label: string;
  price: number;
};

export type Product = {
  // TODO(BE): 검색/상세 API 응답 DTO는 이 화면 타입과 필드명을 맞추는 것을 우선으로 합니다.
  // 백엔드 원본 필드명이 다르면 프론트 API 모듈에서 이 타입으로 변환해서 컴포넌트는 그대로 둡니다.
  id: number;
  platform: string;
  pid: string;
  name: string;
  brand: string;
  price: number;
  status: ProductStatus;
  description: string;
  imageUrl: string | null;
  images: string[];
  link: string;
  date: string;
  category: string;
  priceHistory: PricePoint[];
};
