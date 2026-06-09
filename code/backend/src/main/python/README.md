# Hama Python Backend

Hama 프로젝트의 Python 백엔드 루트입니다.  
**로컬 MVP 전용**으로 `127.0.0.1`에서 API·분석·DB 적재를 실행하는 것을 전제로 합니다. 백엔드 서버 배포는 `code/backend/deploy/`를 별도 참고하세요.

실행 진입점·크롤링 설정·분석 폴더만 루트에 두고, 핵심 라이브러리와 유틸은 하위 폴더로 분리했습니다.

Spring Boot 백엔드는 `code/backend/src/main/java`에 있고, OpenSearch 모듈은 `code/backend/opensearch`에 있습니다.

## 폴더 구조

```text
python/
├── README.md                    # 이 문서
├── requirements.txt
├── .env.example
│
├── api_server.py                # FastAPI MVP 서버 (실행 진입점)
├── import_csv_to_supabase.py    # CSV → Supabase 적재 (실행 진입점)
│
├── crawling/                    # 크롤링 키워드·블랙리스트·스크립트
├── config/                      # 런타임 매칭 설정 CSV
│
├── lib/                         # 핵심 라이브러리 (import 전용)
│   ├── hama_data_pipeline.py    # 상품명 정규화·매칭·카테고리
│   ├── keyword_preprocessing.py # keyword_final 전처리·클러스터 규칙
│   ├── product_matching.py      # 토큰 매칭·Jaccard 유사도
│   ├── item_rating.py           # items.rating 계산 공식
│   └── supabase_repository.py   # Supabase 조회·CSV fallback
│
├── tools/                       # 운영·문서 유틸 (필요 시 실행)
│   ├── apply_supabase_schema.py
│   ├── generate_config_reference_csv.py
│   └── generate_supabase_erd.py
│
└── analysis/                    # 연구·검증 (DB 적재 전 단계)
    ├── notebooks/               # Jupyter 파이프라인
    ├── scripts/                 # 데이터 확인용 CLI
    ├── handoff/                 # DB 적재 handoff CSV
    ├── review/                  # 중간 검토 CSV
    ├── results/                 # 분석 리포트 (gitignore)
    └── archive/                 # 레거시 결과 (gitignore)
```

## 역할 분류

### 루트 — 일상 작업 진입점

| 파일/폴더 | 역할 |
|-----------|------|
| `api_server.py` | `/api/products/search`, 추천, 상세 |
| `import_csv_to_supabase.py` | handoff CSV → `items` / `price_history` upsert |
| `crawling/` | `keyword_list.csv`, `blacklist_*.csv`, `update_keyword_list.py` |
| `config/` | 상품명 Trie·카테고리·제외 토큰 CSV |

### `lib/` — 내부 모듈

| 파일 | 역할 |
|------|------|
| `hama_data_pipeline.py` | `config/*.csv` 기반 상품명 파싱·카테고리 배정 |
| `keyword_preprocessing.py` | `keyword_final.ipynb`와 동일한 전처리·클러스터 규칙 |
| `product_matching.py` | 토큰 사전·Jaccard 매칭 인덱스 |
| `item_rating.py` | `rating`, `cluster_score`, `price_score` 등 계산 |
| `supabase_repository.py` | Supabase `items` 조회, `to_product()` 변환 |

### `tools/` — 유지보수 스크립트

| 파일 | 역할 |
|------|------|
| `apply_supabase_schema.py` | `code/supabase/migrations/*.sql` 적용 |
| `generate_config_reference_csv.py` | 크롤 결과 기반 `config/reference/` 생성 |
| `generate_supabase_erd.py` | `docs/ERD.drawio.png` 재생성 |

### `analysis/` — 분석·검증

| 위치 | 역할 |
|------|------|
| `notebooks/keyword_final.ipynb` | **최종 DB 적재 파이프라인** (전처리→클러스터→rating) |
| `scripts/check_title_keyword_accuracy.py` | keyword↔title 정확성 검사 |
| `scripts/compare_platform_data.py` | 플랫폼별 가격·토큰 비교 |
| `scripts/cluster_bracket_contents.py` | 상품명 `[]` 대괄호 토큰 추출·클러스터 |

## E2E 데이터 흐름

```text
[외부 크롤러]
  → crawling/results/*.csv          (gitignore, 로컬)

analysis/notebooks/keyword_final.ipynb
  → analysis/handoff/keyword_db_input_df.csv
  → analysis/handoff/keyword_dropped_df.csv

import_csv_to_supabase.py --use-cluster-preview
  → Supabase items (platform_name, rating 등) / price_history

code/backend/opensearch/sync_from_supabase.py
  → OpenSearch hama_items 인덱스

api_server.py  (/api/products/search)
  → 프론트 Product 응답
```

## 환경 설정

`.env.example`을 복사해 `.env`를 만듭니다.

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATABASE_URL=postgresql://...
HAMA_OPENSEARCH_ENABLED=false
HAMA_OPENSEARCH_URL=http://localhost:9200
```

Supabase 값이 없으면 `api_server.py`는 `crawling/results/` 최신 CSV를 fallback으로 읽습니다. OpenSearch는 기본값이 `false`이며, 로컬에서 켜지 않아도 Python 인메모리 검색으로 동작합니다.

## 실행 방법

프로젝트 루트 기준 PowerShell:

```powershell
cd code/backend/src/main/python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 1. 스키마 적용

```powershell
python tools/apply_supabase_schema.py
```

### 2. 데이터 적재

```powershell
python import_csv_to_supabase.py --use-cluster-preview
```

입력 파일: `analysis/handoff/keyword_db_input_df.csv`

### 3. OpenSearch 색인 (선택)

```powershell
cd ../../opensearch
python sync_from_supabase.py
```

### 4. API 서버

```powershell
cd ../src/main/python
python -m uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload
```

### 5. 최종 파이프라 재실행 (노트북)

```powershell
cd analysis/notebooks
jupyter notebook keyword_final.ipynb
```

### 6. 분석 스크립트

```powershell
cd analysis/scripts
python check_title_keyword_accuracy.py
python compare_platform_data.py
python cluster_bracket_contents.py
```

## 관련 문서

- [매칭 설정 CSV 가이드](./config/README.md)
- [Supabase 설정](../../../docs/supabase_setup.md)
- [OpenSearch 구조](../../opensearch/README.md)
- [Supabase migration](../../supabase/README.md)
