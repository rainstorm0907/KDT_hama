# Hama 요구사항정의서

| 항목 | 내용 |
|---|---|
| 프로젝트명 | Hama (하우마치) — 중고 매물 통합 검색·가격 비교 서비스 |
| 작성 기준일 | 2026-06-12 (라이브 구현 기준) |
| 배포 | FE: Vercel (https://kdt-hama.vercel.app) / BE: AWS EC2 (nginx + FastAPI + Spring Boot) / DB: Supabase(PostgreSQL) + OpenSearch |

## 1. 프로젝트 개요

### 1.1 배경
중고 거래 사용자는 같은 물건을 사고팔 때마다 번개장터·중고나라 등 여러 앱을 번갈아 비교해야 한다. 기존 통합 검색 서비스는 외부 플랫폼을 실시간 호출해 응답이 느리고, 검색어가 태그에만 걸린 광고성 매물과 1원·999,999,999원 같은 플레이스홀더 가격이 섞여 "믿을 수 있는 시세"를 제공하지 못한다.

### 1.2 목표
- 두 플랫폼의 매물을 자체 DB로 수집·정제해 **빠르고 신뢰할 수 있는 통합 검색**을 제공한다.
- 정크 매물(교환글·구매글·악세서리·플레이스홀더 가격)을 걸러낸 **신뢰 가능한 시세 요약**(최저가/평균가/가격 추이)을 제공한다.
- 찜·알림·가격비교·챗봇으로 **구매 의사결정을 돕는 부가 기능**을 제공한다.

### 1.3 대상 플랫폼
번개장터, 중고나라 (수집 키워드: 아이폰, 맥북, 갤럭시, 아이패드, 에어팟 등)

## 2. 기능 요구사항

### 2.1 회원 (FR-AUTH)

| ID | 요구사항 | 구현 |
|---|---|---|
| FR-AUTH-01 | 이메일/비밀번호 회원가입 (약관 동의, 프로필 입력 단계) | Spring `/api/auth/signup` |
| FR-AUTH-02 | 로그인/로그아웃 (세션 쿠키 기반) | Spring `/api/auth/login`, `/api/auth/logout` |
| FR-AUTH-03 | 프로필 조회/수정, 비밀번호 변경 | Spring `/api/mypage/profile`, `/api/mypage/password` |
| FR-AUTH-04 | 회원 탈퇴 — soft delete(`account_status='WITHDRAWN'`, 행 유지) | Spring `/api/mypage/me` DELETE |
| FR-AUTH-05 | 관리자 권한 — `users.role='ADMIN'`만 관리자 페이지 접근 | Spring `/api/mypage/admin/check` + FE 라우트 가드 |

### 2.2 통합 검색 (FR-SEARCH)

| ID | 요구사항 | 구현 |
|---|---|---|
| FR-SEARCH-01 | 키워드로 두 플랫폼 매물 통합 검색 | FastAPI `/api/products/search` + OpenSearch `hama_items` |
| FR-SEARCH-02 | 정렬: 정확도순 / 낮은 가격순 / 최신순 | OpenSearch sort |
| FR-SEARCH-03 | 플랫폼 필터 (번개장터/중고나라 토글) | terms filter |
| FR-SEARCH-04 | 시세 요약 카드: 최저가·평균가·업데이트 시각 | OpenSearch 집계 + 정크 하한/상한 (4.2 참고) |
| FR-SEARCH-05 | 페이지네이션, 행수(4/6/8줄) 선택 | from/size |
| FR-SEARCH-06 | 인기 검색 키워드 칩 노출 | FE 정적 + 최근 검색 기록(localStorage) |
| FR-SEARCH-07 | 오타 허용(fuzziness), 제목/표준상품명/키워드 다중 필드 매칭 | multi_match best_fields + fuzziness AUTO |

### 2.3 상품 상세·시세 (FR-DETAIL)

| ID | 요구사항 | 구현 |
|---|---|---|
| FR-DETAIL-01 | 상세 모달: 이미지, 가격, 상태, 설명, 원본 링크 | FastAPI `/api/products/{platform}/{pid}` |
| FR-DETAIL-02 | 가격 추이 차트 — 상품이 속한 클러스터의 일자별 평균 시세 | FastAPI `/api/products/{platform}/{pid}/insights` (price_history 온더플라이 집계) |
| FR-DETAIL-03 | 관련 클러스터(같은 모델 다른 용량 등) 전환 드롭다운 | insights `relatedClusters` |
| FR-DETAIL-04 | 기간 필터 3달/1달/1주 — 날짜 기반 윈도우 | points의 ISO `date` 필드 기준 필터 |
| FR-DETAIL-05 | 상세 조회 시 최근 본 상품 기록(로그인 시) | Spring `/api/mypage/recent-items` |

### 2.4 가격 비교 (FR-COMPARE)

| ID | 요구사항 | 구현 |
|---|---|---|
| FR-COMPARE-01 | 상품 2~4개를 골라 클러스터 시세 라인 위에 등록일 기준 마커로 비교 | PriceCompareWorkspace + insights 클러스터 트렌드 |
| FR-COMPARE-02 | 선택 상품 가격순 목록, 카드에서 상세 진입 | FE |
| FR-COMPARE-03 | 비교 후보 보관(비로그인 가능, localStorage) | FE |

### 2.5 찜·알림 (FR-WISH / FR-NOTI)

| ID | 요구사항 | 구현 |
|---|---|---|
| FR-WISH-01 | 상품 찜 추가/삭제 (로그인 필요, 비로그인 시 로그인 유도) | Spring `/api/mypage/wishlists` (DB 저장) |
| FR-WISH-02 | 찜 목록 조회·삭제·되돌리기 토스트 | 마이페이지 찜 탭 |
| FR-WISH-03 | 상품별 최저가 알림 토글 | `/api/mypage/wishlists/alert` (`is_lowest_alert`) |
| FR-NOTI-01 | 알림 설정 3종: 최저가/판매 상태/새 상품 키워드 | `/api/mypage/notification-settings` |
| FR-NOTI-02 | 키워드 알림 등록/해제 | FE + keyword_alerts |
| FR-NOTI-03 | 마이페이지 탭 재진입 시 자동 재조회 없이 캐시 즉시 표시, 갱신은 수동 새로고침 | react-query 캐시 (staleTime 30분) |

### 2.6 챗봇 (FR-CHAT)

| ID | 요구사항 | 구현 |
|---|---|---|
| FR-CHAT-01 | 자연어 질의 → Gemini 의도 분석(추천/시세/FAQ) | Spring chatbot + Gemini API |
| FR-CHAT-02 | 조건(키워드·가격 상한) 파싱 후 매물 추천 카드 응답 — 가격 오름차순 정렬 | RecommendationService + OpenSearch |
| FR-CHAT-03 | FAQ 패턴 응답 (chat_faq 188행) | ChatbotService |
| FR-CHAT-04 | 대화 이력 저장 (로그인 필요) | chat_history |

### 2.7 관리자 (FR-ADMIN)

| ID | 요구사항 | 구현 |
|---|---|---|
| FR-ADMIN-01 | 운영 지표 카드: 전체 매물 수, 클러스터 배정 수, 저신뢰 매물, 악세서리 의심 | FastAPI `/api/products/anomalies/summary` |
| FR-ADMIN-02 | 이상 데이터 검수: 저신뢰(cluster_confidence) / 악세서리 토큰 모드 | `/api/products/anomalies?mode=` |
| FR-ADMIN-03 | 이상 데이터 가격·신뢰도 정렬(서버 정렬) + 페이지네이션 | `sort=confidence_asc\|confidence_desc\|price_asc\|price_desc` |
| FR-ADMIN-04 | 회원 조회: 검색·필터(전체/관리자/탈퇴), 찜 수 | Spring `/api/admin/users` (ADMIN 403 가드) |

### 2.8 데이터 파이프라인 (FR-DATA)

| ID | 요구사항 | 구현 |
|---|---|---|
| FR-DATA-01 | 키워드 기반 크롤링 → CSV → Supabase 적재 (items, price_history) | crawling/ + import_csv_to_supabase.py |
| FR-DATA-02 | 상품명 정규화·토큰 매칭 → 클러스터 배정(cluster_product_name) + 신뢰도 | lib/keyword_preprocessing.py, keyword_final 파이프라인 |
| FR-DATA-03 | 종합 점수(rating): 클러스터/가격/조회/최근성 가중합 | lib/item_rating.py |
| FR-DATA-04 | OpenSearch 인덱싱 + 품질 플래그(quality_flags) 부여 | opensearch/sync_from_supabase.py, documents.py |

## 3. 비기능 요구사항

| ID | 요구사항 | 구현 |
|---|---|---|
| NFR-01 | 검색 응답: 외부 플랫폼 실시간 호출 없이 자체 인덱스로 응답 | OpenSearch 단일 쿼리 (45,249건 인덱스) |
| NFR-02 | 검색 폴백: OpenSearch 장애 시 Supabase/CSV 경로로 동작 (`searchSource` 필드로 구분) | FastAPI python 폴백 |
| NFR-03 | 인증: 세션 쿠키, 비밀번호 해시 저장 | Spring Security |
| NFR-04 | 시크릿 분리: API 키·DB 자격증명은 .env/환경파일, repo에는 example만 | .env.example, /etc/hama-spring.env |
| NFR-05 | 배포 재현성: nginx/systemd 설정과 마이그레이션을 repo에 수록 | code/backend/deploy/, code/supabase/migrations/ |

## 4. 데이터 품질 규칙 (시세 신뢰성의 핵심)

### 4.1 quality_flags (인덱싱 시 부여, 검색·집계에서 제외)
| 플래그 | 조건 | 거르는 대상 |
|---|---|---|
| `noise_candidate` | 제목에 구매/매입/삽니다/대여/사기꾼 등 토큰 | 판매글이 아닌 글 |
| `accessory_candidate` | 제목에 케이스/필름/공박스 등 토큰 (악세서리 검색 의도일 땐 유지) | 본체 검색에 섞이는 악세서리 |
| `invalid_price` | 가격 < 1,000원, 가격 ≥ 2,000만원, 교환글 && (가격 < 10만원 또는 ≥ 1,000만원) | 1원·999,999,999원 플레이스홀더 |

### 4.2 시세 요약 상대 하한
- 검색 결과 중앙값 × 0.2 미만 가격은 최저가/평균가 집계에서 제외 (케이스·공박스 등 토큰 미적중 정크 방어).
- 검색 결과 목록 노출에는 영향 없음.

## 5. 화면 목록

| 화면 | 경로 | 주요 기능 |
|---|---|---|
| 홈 | `/` | 배너, 인기 키워드, 추천 상품 |
| 검색 결과 | `/search?q=` | 통합 검색, 정렬/필터, 시세 요약 카드 |
| 상품 상세 | (모달) | 시세 차트, 찜/알림, 원본 링크 |
| 가격 비교 | (모달) | 다중 상품 시세 비교 |
| 마이페이지 | `/mypage` | 찜/최근 본/알림/가격비교/설정 탭 |
| 관리자 | `/admin` | 지표, 이상 데이터 검수, 회원 조회 |
| 약관/정책 | `/legal/*` | 이용약관, 개인정보처리방침 |

## 6. 제약 및 알려진 한계

- 가격 이력은 수집 시작 시점부터 누적 — 수집 공백 기간(예: 5/28~6/6)의 시세 포인트는 존재하지 않는다.
- 탈퇴 회원의 이메일/닉네임은 soft delete 정책상 중복 체크를 계속 점유한다.
- 맥북 등 일부 키워드는 수집 커버리지가 낮아 검색 결과가 적다.
- 휴대폰 검색 2페이지 이후 `expanded_search_limit`로 인한 페이지네이션 오프셋 어긋남(P3, 공유됨).
