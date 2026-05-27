# Hama

- 조이름: 사육사조
- GitHub: https://github.com/shortKDT
- Notion: https://suave-kip-fd7.notion.site/KDT-350c2695cef080ec881ad5a86bdd8da8

## 프로젝트 설명

Hama는 중고거래 플랫폼의 상품 데이터를 모아 검색, 가격 비교, 가격 추이 확인, 찜 목록, 맞춤 추천을 제공하는 웹 서비스입니다.

현재 로컬 MVP 구조는 다음과 같습니다.

- Frontend: Vite, React, TypeScript
- Backend API: Python FastAPI
- Database: Supabase/PostgreSQL
- Crawling/Preprocessing: Python

프론트는 Vite 개발 서버에서 실행되고, `/api` 요청은 백엔드 API 서버(`http://127.0.0.1:8000`)로 프록시됩니다.

## 실행 방법

아래 명령어는 저장소 폴더명이 `HamaMain`인 기준입니다. 처음에는 저장소가 있는 상위 폴더에서 `cd HamaMain`으로 프로젝트 루트에 들어간 뒤 실행합니다.
백엔드와 프론트엔드는 각각 별도 터미널에서 실행합니다.

### 1. 백엔드 API 서버 실행

저장소가 있는 상위 폴더에서 프로젝트 루트로 먼저 이동합니다.

```bash
cd HamaMain
```

처음 실행하는 컴퓨터라면 가상환경과 패키지를 먼저 준비합니다.

```bash
cd code/backend/src/main/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Supabase를 사용할 경우 `.env.example`을 참고해서 `.env`를 만듭니다.

```bash
cp .env.example .env
```

`.env`에는 아래 값이 필요합니다.

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DATABASE_URL=...
```

서버 실행 명령어입니다. 위 준비 과정을 같은 터미널에서 이어서 했다면 이미 백엔드 폴더 안에 있으므로 `cd`를 다시 하지 않아도 됩니다.

```bash
# 새 터미널이라면 먼저:
cd HamaMain
cd code/backend/src/main/python

source .venv/bin/activate
uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload
```

정상 확인:

```bash
curl http://127.0.0.1:8000/api/health
```

### 2. 프론트엔드 서버 실행

새 터미널을 열었다면 다시 프로젝트 루트로 먼저 이동합니다.

```bash
cd HamaMain
```

처음 실행하는 컴퓨터라면 패키지를 먼저 설치합니다.

```bash
cd code/frontend/Hama
npm install
```

필요하면 `.env.example`을 참고해서 프론트 환경 파일을 만듭니다.

```bash
cp .env.example .env
```

기본값은 아래와 같습니다.

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

제출/배포용 커밋에는 `.env` 파일을 올리지 않습니다.

개발 서버 실행 명령어입니다. 위 준비 과정을 같은 터미널에서 이어서 했다면 이미 프론트 폴더 안에 있으므로 `cd`를 다시 하지 않아도 됩니다.

```bash
# 새 터미널이라면 먼저:
# cd HamaMain
# cd code/frontend/Hama
npm run dev -- --host 127.0.0.1 --port 5178 --strictPort --force
```

브라우저에서 접속:

```text
http://127.0.0.1:5178
```

프론트 빌드 확인:

```bash
# 프론트 폴더에서 실행
npm run build
```

## 주요 기능

- 상품 검색 및 플랫폼 필터
- 검색 결과 정렬
- 상품 상세 팝업
- 가격 인사이트 그래프
- 찜 목록과 마이페이지
- 추천 상품 표시
- Supabase 기반 상품 데이터 조회

## 프로젝트 문서

- [프로젝트 폴더 구조](./docs/project_structure.md)
- [요구사항 문서](./docs/requirements.md)
- [API 명세](./docs/api_spec.md)
- [DB 스키마](./docs/db_schema.sql)
- [Supabase 설정](./docs/supabase_setup.md)

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
- `code/backend/src/main/python/supabase_repository.py`
- `code/backend/src/main/python/hama_data_pipeline.py`
- `code/backend/src/main/python/product_matching.py`
- `code/backend/src/main/python/import_csv_to_supabase.py`
- `code/backend/src/main/python/apply_supabase_schema.py`
- `code/backend/src/main/python/config/**`
- `code/backend/src/main/python/crawling/*.csv`
- `code/backend/src/main/python/requirements.txt`
- `code/backend/src/main/python/.env.example`

올리면 안 되는 파일:

- `.env`, `.env.*` 단, `.env.example` 제외
- `.venv/`, `node_modules/`, `dist/`
- `__pycache__/`, `*.pyc`
- `.DS_Store`, `*.log`
- Supabase service role key, DB 비밀번호, 개인 로컬 경로가 들어간 파일
- 크롤링 실행 중 생긴 임시 결과물과 대용량 원본 데이터
- `code/backend/src/main/python/archive/TEST/**`
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
