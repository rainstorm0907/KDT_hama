import type { PricePoint, Product, ProductStatus } from '../types/product';

type CrawledProduct = {
  platform: string;
  pid: string;
  name: string;
  price: number;
  status: ProductStatus;
  imageUrl: string;
  link: string;
  date: string;
  category: string;
};

const crawledProducts: CrawledProduct[] = [
  {
    platform: '번개장터',
    pid: '404283691',
    name: '고사양 게이밍 화이트 커스텀pc sfx 컴퓨터 판매합니다',
    price: 1800000,
    status: '판매중',
    imageUrl:
      'https://media.bunjang.co.kr/product/404283691_1_1777436685_w720.jpg',
    link: 'https://m.bunjang.co.kr/products/404283691',
    date: '2026-04-30 18:26',
    category: '컴퓨터',
  },
  {
    platform: '중고나라',
    pid: '227857249',
    name: 'Lenovo V15 G4 13세대 i5 노트북',
    price: 410000,
    status: '판매중',
    imageUrl:
      'https://img2.joongna.com/media/original/2026/04/23/1776954493361omm_ZyONK.jpg?impolicy=thumb&size=150',
    link: 'https://web.joongna.com/product/227857249',
    date: '2026-04-30',
    category: '노트북',
  },
  {
    platform: '번개장터',
    pid: '211871042',
    name: '빈티지 휴대폰 2점일괄 소품용',
    price: 47500,
    status: '판매중',
    imageUrl:
      'https://media.bunjang.co.kr/product/211871042_1_1674004450_w720.jpg',
    link: 'https://m.bunjang.co.kr/products/211871042',
    date: '2026-04-30 18:25',
    category: '핸드폰',
  },
  {
    platform: '중고나라',
    pid: '227487068',
    name: '자이언트 프로펠1 울테그라 di2 +보라wto 60 로드자전거',
    price: 4000000,
    status: '판매중',
    imageUrl:
      'https://img2.joongna.com/media/original/2026/04/14/1776131775541Tya_i4vkf.jpg?impolicy=thumb&size=150',
    link: 'https://web.joongna.com/product/227487068',
    date: '2026-04-30',
    category: '자전거',
  },
  {
    platform: '번개장터',
    pid: '404589361',
    name: '한섬의류 타임 블랙원피스.벨트세트 55사이즈',
    price: 179000,
    status: '판매중',
    imageUrl:
      'https://media.bunjang.co.kr/product/404589361_1_1777375383_w720.jpg',
    link: 'https://m.bunjang.co.kr/products/404589361',
    date: '2026-04-30 18:25',
    category: '의류',
  },
  {
    platform: '중고나라',
    pid: '227707424',
    name: 'M.U 스포츠 신발가방',
    price: 10000,
    status: '판매중',
    imageUrl:
      'https://img2.joongna.com/media/original/2026/04/20/1776638942980oEo_Ee6pI.jpg?impolicy=thumb&size=150',
    link: 'https://web.joongna.com/product/227707424',
    date: '2026-04-30',
    category: '신발',
  },
  {
    platform: '번개장터',
    pid: '397774231',
    name: '(마지막 가격내림) 애니 비공굿 굿즈들 판매합니다!',
    price: 14500,
    status: '판매중',
    imageUrl:
      'https://media.bunjang.co.kr/product/397774231_1_1777373196_w720.jpg',
    link: 'https://m.bunjang.co.kr/products/397774231',
    date: '2026-04-30 18:28',
    category: '굿즈',
  },
  {
    platform: '중고나라',
    pid: '225698025',
    name: '후지 파인픽스 6800 zoom 빈티지 디지털 카메라 디카',
    price: 215000,
    status: '판매중',
    imageUrl:
      'https://img2.joongna.com/media/original/2026/02/26/1772115028796Od9_XgN1P.jpg?impolicy=thumb&size=150',
    link: 'https://web.joongna.com/product/225698025',
    date: '2026-04-30',
    category: '카메라',
  },
  {
    platform: '번개장터',
    pid: '404988517',
    name: '2D 판도라 게임기',
    price: 90000,
    status: '판매중',
    imageUrl:
      'https://media.bunjang.co.kr/product/404988517_1_1777541186_w720.jpg',
    link: 'https://m.bunjang.co.kr/products/404988517',
    date: '2026-04-30 18:26',
    category: '게임기',
  },
  {
    platform: '중고나라',
    pid: '227521085',
    name: '미라지가구 애쉴리 거실 대리석테이블',
    price: 250000,
    status: '판매중',
    imageUrl:
      'https://img2.joongna.com/media/original/2026/04/15/1776205359859mAJ_MeUBT.jpg?impolicy=thumb&size=150',
    link: 'https://web.joongna.com/product/227521085',
    date: '2026-04-30',
    category: '가구',
  },
  {
    platform: '번개장터',
    pid: '382700649',
    name: '[공홈등록] 플러그인 얼라이언스 플러그인 5개 일괄 판매',
    price: 44000,
    status: '판매중',
    imageUrl:
      'https://media.bunjang.co.kr/product/382700649_1_1773728604_w720.jpg',
    link: 'https://m.bunjang.co.kr/products/382700649',
    date: '2026-04-30 18:15',
    category: '악기',
  },
  {
    platform: '중고나라',
    pid: '228081519',
    name: '자동장작기계 자동캠핑용장작기계 캠핑용장작자동기계',
    price: 6800000,
    status: '판매중',
    imageUrl:
      'https://img2.joongna.com/media/original/2026/04/30/17774926900718Kn_NTfpF.jpg?impolicy=thumb&size=150',
    link: 'https://web.joongna.com/product/228081519',
    date: '2026-04-30',
    category: '캠핑',
  },
];

export const products: Product[] = crawledProducts.map((product, index) => ({
  id: index + 1,
  platform: product.platform,
  pid: product.pid,
  name: product.name,
  brand: product.category,
  price: product.price,
  status: product.status,
  description: '',
  imageUrl: product.imageUrl,
  images: [product.imageUrl, product.imageUrl, product.imageUrl],
  link: product.link,
  date: product.date,
  category: product.category,
  priceHistory: createPriceHistory(product.price),
}));

function createPriceHistory(price: number): PricePoint[] {
  const labels = ['04.24', '04.25', '04.26', '04.27', '04.28', '04.29', '04.30'];
  const multipliers = [1.08, 1.05, 1.03, 1.01, 0.99, 1.02, 1];

  return labels.map((label, index) => ({
    label,
    price: Math.max(1000, Math.round((price * multipliers[index]) / 1000) * 1000),
  }));
}
