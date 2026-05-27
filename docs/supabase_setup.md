# Hama Supabase 연결 방법

## 1. 환경 준비

아래 명령어는 프로젝트 루트(`HamaMain`)에서 시작하는 기준입니다.

```bash
cd code/backend/src/main/python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`code/backend/src/main/python/.env`를 만들고 아래 값을 채웁니다.

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATABASE_URL=postgresql://postgres.your-project-ref:your-database-password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

`SUPABASE_SERVICE_ROLE_KEY`와 DB 비밀번호는 서버에서만 사용합니다.
프론트엔드 코드나 GitHub에는 절대 올리지 않습니다.

## 2. 테이블 생성

스키마 원본은 아래 migration 파일입니다.

```text
code/supabase/migrations/20260519000000_hama_schema.sql
```

로컬에서는 같은 migration을 스크립트로 적용합니다.

```bash
python apply_supabase_schema.py
```

## 3. CSV 데이터를 Supabase에 넣기

```bash
python import_csv_to_supabase.py
```

스크립트는 기존 크롤링 CSV를 읽어서 아래 테이블에 저장합니다.

- `platforms`
- `items`
- `price_history`

## 4. API 서버 실행

```bash
uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload
```

환경변수가 있으면 Supabase를 읽고, 없으면 기존 CSV fallback으로 동작합니다.

확인:

```bash
curl http://127.0.0.1:8000/api/health
curl "http://127.0.0.1:8000/api/products/search?q=아이폰"
```
