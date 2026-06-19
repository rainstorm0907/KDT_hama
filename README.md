# Hama

- 조이름: 사육사조
- GitHub: https://github.com/shortKDT
- Notion: https://suave-kip-fd7.notion.site/KDT-350c2695cef080ec881ad5a86bdd8da8
- DRIVE: https://drive.google.com/drive/u/0/folders/1_V8_IYdDE5DPy7e_IqMRJWGsNFNyX0dF

## 프로젝트 설명

Hama는 번개장터, 중고나라 등 중고거래 플랫폼의 상품 데이터를 모아 검색, 가격 비교, 가격 추이 확인, 찜 목록, 추천 상품을 제공하는 웹 서비스입니다.

현재 로컬 MVP 구조는 다음과 같습니다.

- Frontend: Vite, React, TypeScript
- Backend API: Python FastAPI
- Backend Java: Spring Boot, Java 21, Gradle
- Database: Supabase/PostgreSQL, 미설정 시 CSV fallback
- Crawling/Analysis: Python 크롤링, 상품명 매칭·클러스터링, rating 계산, 가격 이상치/정합성 분석

프론트는 Vite 개발 서버에서 실행되고, `/api` 요청은 기본적으로 Python FastAPI 서버(`http://127.0.0.1:8000`)로 프록시됩니다. Spring Boot 백엔드는 `code/backend`에 통합되어 있으며 인증, 상품, 마이페이지, 챗봇 API 구현을 포함합니다.

## 실행 방법

아래 명령어는 현재 저장소 루트가 `c:\project\kdtproject\kdtproject`인 기준입니다. 백엔드와 프론트엔드는 각각 별도 터미널에서 실행합니다.

### 1. 백엔드 API 서버 실행

PowerShell 기준:

```powershell
cd "c:\project\kdtproject\kdtproject\code\backend\src\main\python"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

macOS/Linux 기준:

```bash
cd code/backend/src/main/python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Supabase를 사용할 경우 `.env.example`을 참고해서 `.env`를 만듭니다. `.env`가 없거나 Supabase 값이 비어 있으면 `crawling/results`의 최신 CSV를 fallback 데이터로 읽습니다.

스키마 적용과 데이터 적재:

```powershell
python tools/apply_supabase_schema.py
python import_csv_to_supabase.py --use-cluster-preview
```

자세한 내용은 [Supabase 설정](./docs/supabase_setup.md)을 참고합니다.

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DATABASE_URL=...
```

서버 실행:

```powershell
python -m uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload
```

정상 확인:

```powershell
curl http://127.0.0.1:8000/api/health
```

### 2. 프론트엔드 서버 실행

PowerShell 기준:

```powershell
cd "c:\project\kdtproject\kdtproject\code\frontend\Hama"
npm install
npm run dev -- --host 127.0.0.1 --port 5178 --strictPort --force
```

`/api` 프록시 대상은 환경변수로 바꿀 수 있습니다 (기본값: FastAPI `127.0.0.1:8000`, Spring `127.0.0.1:8001`).
로컬에서 Spring 없이 회원/찜/알림 기능까지 확인하려면 Spring 프록시만 라이브 EC2로 돌립니다.

```bash
# 예: 검색은 로컬 FastAPI, 회원/찜/알림/챗봇은 라이브 EC2 Spring
FASTAPI_PROXY_TARGET=http://127.0.0.1:8000 \
SPRING_API_PROXY_TARGET=http://15.134.191.154 \
npm run dev
```

브라우저에서 접속:

```text
http://127.0.0.1:5178
```

프론트 빌드 확인:

```powershell
npm run build
```

### 3. Spring Boot 백엔드 확인

Spring Boot 프로젝트 루트는 `code/backend`입니다. Python FastAPI와 포트가 겹치지 않도록 기본 포트는 `8080`으로 분리되어 있습니다.

```powershell
cd "c:\project\kdtproject\kdtproject\code\backend"
```

필요 환경변수는 `.env.example`을 참고합니다.

```text
SERVER_PORT=8080
DB_URL=jdbc:postgresql://localhost:5432/postgres
DB_USERNAME=postgres
DB_PASSWORD=postgres
GEMINI_API_KEY=...
```

현재 저장소에는 `gradle-wrapper.jar`가 없으면 `gradlew.bat` 실행이 실패할 수 있습니다. 이 경우 Gradle wrapper를 재생성하거나 시스템 Gradle을 설치한 뒤 빌드합니다.

## 데이터 적재 흐름

```text
크롤링 CSV
  -> analysis/notebooks/keyword_final.ipynb (전처리, cluster_product_name, rating)
  -> analysis/handoff/keyword_db_input_df.csv
  -> import_csv_to_supabase.py --use-cluster-preview
  -> Supabase items (platform_name, original_id, rating 등) / price_history
  -> opensearch/sync_from_supabase.py (검색 인덱스 갱신, 선택)
```

`items` 테이블은 `platform_name` + `original_id`로 플랫폼별 상품을 식별합니다. 별도 `platforms` 테이블은 사용하지 않습니다.

## 주요 기능

- 상품 검색, 플랫폼 필터, 정렬, 페이지네이션
- 상품 상세 팝업과 가격 인사이트
- 추천 상품과 최근 검색 기반 추천
- 찜 목록, 최근 본 상품, 알림 후보, 가격 비교 리스트 로컬 저장
- 가격 비교 모달/마이페이지 탭과 비교 그래프
- 관리자 대시보드 UI
- 사이드 버튼: 맨 위로, 가격 비교, 챗봇, 알림
- Supabase 기반 상품 데이터 조회, CSV fallback 지원

## 구현 상태

- 현재 API 연동 완료: 상품 검색, 추천, 상품 상세
- 로컬스토리지 우선 동작: 찜, 최근 본 상품, 알림 후보, 가격 비교 리스트, 최근 검색어
- UI만 존재하고 API 연결이 남은 영역: 로그인/회원가입, 관리자 대시보드 데이터, 챗봇, 계정 기반 찜/알림 저장
- Spring Boot 영역: `code/backend/src/main/java/com/used/service`에 인증, 상품, 마이페이지, 챗봇 API 구현 통합

## 프로젝트 문서

- [프로젝트 폴더 구조](./docs/project_structure.md)
- [요구사항 및 작성 기준](./docs/requirements.md)
- [API 명세](./docs/api_spec.md)
- [구현 파일 체크리스트](./docs/document_checklist.md)
- [검색 정합성 계획](./docs/search_relevance_plan.md)
- [Supabase 설정](./docs/supabase_setup.md)
- [Oracle 기준 DB 스키마](./docs/db_schema.sql)
- [Supabase/PostgreSQL 스키마](./docs/supabase_schema.sql)
- [DB 컬럼 카탈로그](./docs/db_column_catalog.md)
- [Supabase migration 관리](./code/supabase/README.md)
- [Python 백엔드 README](./code/backend/src/main/python/README.md)
- [OpenSearch 구조](./code/backend/opensearch/README.md)
- [프론트엔드 상세 README](./code/frontend/Hama/README.md)

## GitHub 업로드 기준

올릴 파일:

- `README.md`
- `docs/**`
- `code/supabase/**`
- `code/frontend/Hama/src/**`
- `code/frontend/Hama/public/**`
- `code/frontend/Hama/package.json`
- `code/frontend/Hama/package-lock.json`
- `code/frontend/Hama/.env.example`
- `code/frontend/Hama/index.html`
- `code/frontend/Hama/vite.config.ts`
- `code/frontend/Hama/tsconfig.json`
- `code/frontend/Hama/eslint.config.js`
- `code/frontend/Hama/postcss.config.js`
- `code/frontend/Hama/tailwind.config.js`
- `code/backend/src/main/python/api_server.py`
- `code/backend/src/main/python/import_csv_to_supabase.py`
- `code/backend/src/main/python/lib/**`
- `code/backend/src/main/python/tools/**`
- `code/backend/src/main/python/config/**`
- `code/backend/src/main/python/crawling/*.csv`
- `code/backend/src/main/python/crawling/update_keyword_list.py`
- `code/backend/src/main/python/analysis/notebooks/*.ipynb`
- `code/backend/src/main/python/analysis/scripts/*.py`
- `code/backend/src/main/python/analysis/handoff/**`
- `code/backend/src/main/python/analysis/paths.py`
- `code/backend/src/main/python/README.md`
- `code/backend/src/main/python/requirements.txt`
- `code/backend/src/main/python/.env.example`

올리면 안 되는 파일:

- `.env`, `.env.*` 단, `.env.example` 제외
- `.venv/`, `node_modules/`, `dist/`
- `__pycache__/`, `*.pyc`
- `.DS_Store`, `*.log`
- Supabase service role key, DB 비밀번호, 개인 로컬 경로가 들어간 파일
- 크롤링 실행 중 생긴 임시 결과물과 대용량 원본 데이터
- `code/backend/src/main/python/analysis/results/**`
- `code/backend/src/main/python/analysis/archive/**`
- `code/backend/src/main/python/analysis/review/**` (재생성 가능)
- `code/backend/src/main/python/crawling/archive/**`
- `code/backend/src/main/python/crawling/results/**`

## 팀원 정보

- **정지원**
  - 팀장
  - 백엔드 & DB 설계
  - GitHub 레포지토리 관리
  - GitHub: https://github.com/jiwon-jung323

- **정우진**
  - 프로젝트 매니저
  - 백엔드 데이터 수집 파이프라인
  - 프론트엔드 구조 및 UI 구현
  - GitHub: https://github.com/rainstorm0907

- **김다은**
  - 프론트엔드
  - 홈 화면 및 공통 컴포넌트 구현
  - GitHub: https://github.com/rlekdm

- **이준호**
  - 백엔드
  - 챗봇 기능 구현
  - GitHub: https://github.com/dlwnsgh1130
