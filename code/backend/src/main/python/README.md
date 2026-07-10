# Hama Python Backend

Hama 프로젝트의 Python 백엔드 루트입니다.  
**로컬 MVP 전용**으로 `127.0.0.1`에서 API·분석·DB 적재를 실행하는 것을 전제로 합니다.

**`python/` 루트의 `.py` 파일만 실행**하면 스키마 적용부터 API 서버까지 진행할 수 있습니다. 하위 폴더(`lib/`, `tools/`, `analysis/`, `crawling/archive/`)는 직접 실행할 필요가 없습니다.

Spring Boot 백엔드는 `code/backend/src/main/java`에 있고, OpenSearch 모듈은 `code/backend/opensearch`에 있습니다.

## 실행 파일 (python/ 루트)

| 순서 | 파일 | 역할 |
|------|------|------|
| 0 (최초 1회) | `apply_schema.py` | Supabase migration SQL 적용 |
| 1 | `run_crawling.py` | 키워드 크롤링 → `crawling/results/*.csv` |
| 2 | `run_refine_data.py` | 전처리·클러스터·rating → `analysis/handoff/*.csv` |
| 3 | `run_upload.py` | handoff CSV → Supabase 적재 |
| 전체 | `run_pipeline.py` | 1~3단계 한 번에 실행 (`--skip-crawling`, `--skip-upload` 지원) |
| API | `api_server.py` | FastAPI MVP 서버 (`127.0.0.1:8000`) |

`import_csv_to_supabase.py`는 이전 문서 호환용 래퍼이며, 새 실행은 `run_upload.py`를 사용합니다.

## 폴더 구조

```text
python/
├── apply_schema.py
├── run_crawling.py
├── run_refine_data.py
├── run_upload.py
├── run_pipeline.py
├── api_server.py
├── import_csv_to_supabase.py   # 호환용 래퍼
│
├── lib/                        # 내부 모듈 (직접 실행하지 않음)
│   ├── crawling_pipeline.py
│   ├── keyword_final_pipeline.py
│   ├── supabase_import.py
│   ├── supabase_schema.py
│   └── ...
│
├── crawling/                   # keyword_list.csv, blacklist CSV
├── config/                     # API 런타임 매칭 설정 CSV
├── tools/                      # 문서·참고 CSV 생성 유틸 (선택)
└── analysis/                   # 노트북·검증 스크립트 (선택)
```

## E2E 데이터 흐름

```text
apply_schema.py            (최초 1회)

run_crawling.py
  → crawling/results/통합조회_전체_no_filter_*.csv

run_refine_data.py
  → analysis/handoff/keyword_db_input_df.csv
  → analysis/handoff/keyword_dropped_df.csv

run_upload.py
  → Supabase items / price_history

api_server.py
  → 프론트 Product 응답
```

한 번에 실행:

```powershell
python run_pipeline.py
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

## 실행 방법

프로젝트 루트 기준 PowerShell:

```powershell
cd code/backend/src/main/python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 최초 설정

```powershell
python apply_schema.py
```

### 데이터 파이프라인 (단계별)

```powershell
python run_crawling.py
python run_refine_data.py
python run_upload.py
```

### 데이터 파이프라인 (한 번에)

```powershell
python run_pipeline.py
```

이미 크롤링 결과가 있을 때:

```powershell
python run_pipeline.py --skip-crawling
```

### API 서버

```powershell
python api_server.py
```

### OpenSearch 색인 (선택, python 루트 밖)

```powershell
cd ../../opensearch
python sync_from_supabase.py
```

## 관련 문서

- [매칭 설정 CSV 가이드](./config/README.md)
- [Supabase 설정](../../../docs/supabase_setup.md)
- [OpenSearch 구조](../../opensearch/README.md)
- [Supabase migration](../../supabase/README.md)
