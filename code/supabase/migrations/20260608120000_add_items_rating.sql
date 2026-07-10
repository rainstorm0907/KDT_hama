-- items 테이블 rating 및 파생 점수 컬럼 추가
-- 상세 컬럼 정의서(테이블별 양식)는 추후 docs 에 정리 예정

alter table public.items
  add column if not exists cluster_product_name text,
  add column if not exists cluster_confidence numeric(4, 2),
  add column if not exists cluster_score numeric(5, 2),
  add column if not exists price_score numeric(5, 2),
  add column if not exists view_score numeric(5, 2),
  add column if not exists recency_score numeric(5, 2),
  add column if not exists view_count integer not null default 0,
  add column if not exists rating numeric(6, 2) not null default 0;

comment on column public.items.cluster_product_name is '클러스터링 결과 표준 상품명';
comment on column public.items.cluster_confidence is '클러스터 매칭 신뢰도 (0~1)';
comment on column public.items.cluster_score is '클러스터링 점수 (0~100)';
comment on column public.items.price_score is '최저가 근접 점수 (0~100)';
comment on column public.items.view_score is '조회수 점수 (0~100)';
comment on column public.items.recency_score is '최근성 점수 (0~100)';
comment on column public.items.view_count is '누적 조회수';
comment on column public.items.rating is '종합 rating 점수 (0~100)';

create index if not exists idx_items_rating_desc
  on public.items (rating desc);

create index if not exists idx_items_cluster_product_name
  on public.items (cluster_product_name);
