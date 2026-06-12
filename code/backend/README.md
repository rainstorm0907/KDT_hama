# Hama Backend 통합 문서

백엔드(Python·Spring·OpenSearch·배포)의 **단일 진입점** 문서입니다.
기존에 흩어져 있던 `PLSREADME.md`, `src/main/python/README.md`, `opensearch/README.md`의 핵심을 한곳에 정리했고, 세부 내용이 필요하면 각 문서로 내려가면 됩니다.

```text
크롤링/정제 (Python, 로컬·배치)
  -> Supabase DB 저장 (기준 데이터)
  -> OpenSearch 색인 (검색용 복사본)
  -> FastAPI(:8000) 상품 검색/추천 · Spring(:8001) 인증/마이페이지/챗봇
  -> Nginx(:80) 단일 진입점 -> Vercel 프론트
```

---

## 1. 배포 토폴로지 (운영 현행)

| 구성 | 위치 | 비고 |
|------|------|------|
| 프론트 | Vercel — https://kdt-hama.vercel.app | HTTPS는 Vercel 엣지에서 종단 |
| API 진입점 | EC2 Nginx `:80` | `vercel.json`이 `/api/*`를 이리로 rewrite |
| 상품 API | FastAPI `:8000` (systemd `hama-fastapi`) | 검색·추천·상세·insights |
| 사용자 API | Spring Boot `:8001` (systemd `hama-backend`) | 인증·마이페이지·찜·알림·**챗봇(로그인 필수)** |
| 검색엔진 | OpenSearch `:9200` (Docker, 내부 전용) | 외부 차단, `hama_items` 인덱스 |
| DB | Supabase PostgreSQL | 기준 데이터 저장소 (21개 테이블) |
| EC2 IP | **Elastic IP로 고정됨** | stop/start 해도 IP 불변 |

**Nginx 라우팅 규칙** (`nginx-hama.conf.example` 참고):
- `/api/products/`(insights 포함), `/api/health` → FastAPI `:8000`
- `/api/chatbot/` → Spring `:8001` (로그인 세션 필요, 비로그인 401)
- 나머지 `/api/` (auth, mypage, admin 등) → Spring `:8001`
- `:8001`과 `:9200`은 보안그룹에서 외부 차단 — 반드시 Nginx 경유

## 2. Python 파이프라인 (수집 → 정제 → 적재)

위치: `src/main/python/` — **루트의 `run_*.py`만 실행**하면 됩니다. `lib/`, `analysis/`, `crawling/archive/`는 직접 실행하지 않습니다.

| 순서 | 파일 | 역할 |
|------|------|------|
| 0 (최초 1회) | `apply_schema.py` | Supabase migration SQL 적용 |
| 1 | `run_crawling.py` | 키워드 크롤링 → `crawling/results/*.csv` |
| 2 | `run_refine_data.py` | 전처리·클러스터·rating → `analysis/handoff/*.csv` |
| 3 | `run_upload.py` | handoff CSV → Supabase 적재 |
| 전체 | `run_pipeline.py` | 1~3 한 번에 (`--skip-crawling`, `--skip-upload`) |
| API | `api_server.py` | FastAPI 서버 (로컬 `127.0.0.1:8000`) |

핵심 모듈:
- `lib/crawling_pipeline.py` — 번개장터 API(`get_bunjang_data`) + 중고나라 웹(`get_joongna_web_data`). 요청 지연·페이지 제한·재시도 내장.
- `lib/hama_data_pipeline.py` — 상품명 정규화, Aho-Corasick 키워드 사전 매칭, canonical_name/카테고리 생성, 블랙리스트·가격 이상치 필터.
- `lib/product_matching.py` — 토큰화, Jaccard 유사도, 클러스터 보조.
- `import_csv_to_supabase.py` — items/price_history upsert.

로컬 실행:
```bash
cd code/backend/src/main/python
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api_server:app --host 127.0.0.1 --port 8000
```

## 3. 설정 CSV (코드 수정 없이 규칙 갱신)

| 파일 | 위치 | 용도 |
|------|------|------|
| `keyword_list.csv` | `crawling/` | 크롤링 대상 키워드 |
| `blacklist_keywords.csv` / `blacklist_tokens.csv` | `crawling/` | 수집 단계 노이즈 제외 |
| `product_token_dictionary.csv` | `config/` | 브랜드·모델·스펙 별칭 사전 (트라이 매칭의 원천) |
| `category_rules.csv`, `token_exclude_list.csv` | `config/` | 카테고리 배정·정제 제외 토큰 |
| `accessory_tokens.csv` | `config/` | 액세서리 의심 매물 식별(관리자 이상 데이터) |

공통 규칙: UTF-8, `enabled=1`만 사용, 별칭은 쉼표 구분, 띄어쓰기 변형(`아이폰16프로`)도 alias에 함께 등록. 자세한 작성법은 `src/main/python/config/README.md`.

## 4. OpenSearch

- Supabase가 **기준 DB**, OpenSearch는 **검색용 복사본** — 대체재가 아님.
- 색인: `opensearch/sync_from_supabase.py` → `hama_items` 인덱스.
- 검색: `opensearch/repository.py` — 필드 가중치 `canonical_name^5, title^4, matched_keywords^3, normalized_title^2`, 노이즈·비정상가·액세서리 제외(액세서리 직접 검색 시 해제).
- 흐름: OpenSearch가 `item_id` 후보+점수 반환 → FastAPI가 Supabase에서 실데이터 재조회.
- 장애 시 Python/Supabase 검색으로 자동 fallback (`/api/health`의 `searchSource`로 확인).
- 실행/도커/재색인 상세: `opensearch/README.md`.

## 5. Spring Boot (인증·마이페이지·챗봇)

- 위치: `src/main/java/com/used/service/` — Spring Security 세션 인증(BCrypt), `/api/me`·`/api/mypage/**`·`/api/chatbot/**`는 로그인 필수.
- 챗봇: 템플릿 즉답 → 가격 조언 → Gemini 의도분석 → DB FAQ(`chat_faq`, 188패턴 시드) → OpenSearch 추천 카드. 키는 EC2 `/etc/hama-spring.env`의 `GEMINI_API_KEY`.
- 관리자: `users.role='ADMIN'` + `GET /api/mypage/admin/check`로 판별, `GET /api/admin/users` 등 admin 가드.
- 빌드: `gradle clean bootJar` → `build/libs/hama-backend-0.0.1-SNAPSHOT.jar` (Java 21, EC2 메모리 부족 시 로컬 빌드 후 scp).

## 6. 운영 확인 명령 모음

```bash
# 서비스 상태 (EC2)
systemctl status hama-fastapi hama-backend
docker ps                          # opensearch 컨테이너

# 헬스/검색
curl -s http://localhost/api/health
curl -s "http://localhost/api/products/search?q=아이폰&limit=3"

# 챗봇 (로그인 세션 필요 — 401이면 정상 가드)
curl -s -X POST http://localhost/api/chatbot/message \
  -H 'Content-Type: application/json' -d '{"message":"하마가 뭐야?"}'

# 재배포
sudo systemctl restart hama-fastapi    # python 파일 교체 후
sudo systemctl restart hama-backend    # jar 교체 후
```

## 7. 더 깊은 내용은

| 주제 | 문서 |
|------|------|
| 배포 상세·EC2 비용·보안 체크·운영 흐름 | `PLSREADME.md` |
| Python 폴더 구조·E2E 흐름·환경 변수 | `src/main/python/README.md` |
| OpenSearch 검색·필터·정렬 로직 상세 | `opensearch/README.md` |
| 분석 노트북·handoff 구조 | `src/main/python/analysis/README.md` |
| 설정 CSV 작성 가이드 | `src/main/python/config/README.md` |
