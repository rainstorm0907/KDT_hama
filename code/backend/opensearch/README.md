# Hama OpenSearch 구조 설명

이 폴더는 Hama 프로젝트에 OpenSearch를 붙이기 위한 설정/문서 파일을 모아둔 곳입니다.

OpenSearch 관련 Docker 설정, 인덱스 매핑, 검색 모듈, 색인 배치 스크립트는 이 폴더에서 함께 관리합니다.

OpenSearch는 상품 DB를 대체하는 것이 아닙니다.
상품 가격, 상태, 이미지, 상세 정보의 기준은 여전히 Supabase의 `items` 테이블입니다.

OpenSearch의 역할은 하나입니다.

```text
사용자가 검색어 입력
-> OpenSearch가 검색어와 잘 맞는 상품 item_id 후보를 빠르게 찾음
-> FastAPI가 그 item_id로 Supabase에서 실제 상품 정보를 다시 조회
-> 프론트에는 기존 상품 응답 형태로 전달
```

즉, OpenSearch는 **검색 후보를 빠르게 찾는 검색 전용 서버**이고, Supabase는 **실제 상품 데이터의 기준 DB**입니다.

## 왜 OpenSearch를 쓰나요?

현재 기존 검색 방식은 FastAPI가 상품 목록을 불러온 뒤 Python 코드로 검색어 포함 여부와 정렬을 처리합니다.
상품 수가 적을 때는 괜찮지만, 크롤링 데이터가 많아지면 검색이 느려지고 정확도 조정도 어려워집니다.

OpenSearch를 쓰면 다음 장점이 있습니다.

- 상품명, 표준 상품명, 매칭 키워드에 각각 다른 가중치를 줄 수 있습니다.
- 검색어와 비슷한 단어도 어느 정도 찾을 수 있습니다.
- 플랫폼 필터, 가격순, 최신순 같은 조건을 검색 서버에서 처리할 수 있습니다.
- FastAPI는 전체 상품을 훑지 않고, OpenSearch가 찾은 후보만 DB에서 다시 조회하면 됩니다.

## 전체 흐름

```text
Supabase items 테이블
  -> code/backend/opensearch/sync_from_supabase.py
  -> code/backend/opensearch/documents.py
  -> OpenSearch hama_items 인덱스
  -> code/backend/opensearch/repository.py
  -> code/backend/src/main/python/api_server.py의 /api/products/search
  -> Supabase에서 item_id 기준 상품 상세 재조회
  -> 프론트 Product 응답
```

조금 더 쉽게 말하면:

```text
DB 상품 데이터
-> 검색용 문서로 변환
-> OpenSearch에 저장
-> 검색할 때 OpenSearch가 후보 상품 id를 찾음
-> DB에서 진짜 상품 정보를 다시 가져옴
```

## 파일 역할

- `docker-compose.yml`
  로컬에서 OpenSearch 서버를 띄우기 위한 Docker 설정입니다.

- `index_mapping.json`
  OpenSearch 안에 만들 `hama_items` 검색 인덱스 구조입니다.
  어떤 필드를 검색할지, 어떤 필드는 정렬/필터에 쓸지 정의합니다.

- `documents.py`
  Supabase의 `items` row를 OpenSearch에 저장할 검색 문서로 바꿉니다.
  예를 들어 `아이폰16프로맥스`를 `아이폰 16 프로 맥스`처럼 검색하기 좋은 형태로 정리합니다.

- `repository.py`
  FastAPI가 OpenSearch에 검색 요청을 보내고, 검색된 `item_id` 목록을 받는 파일입니다.

- `sync_from_supabase.py`
  Supabase 상품 데이터를 OpenSearch에 넣는 배치 스크립트입니다.
  크롤링 후 DB 저장이 끝난 다음 실행하는 작업으로 보면 됩니다.

## 현재 연결 상태

현재 코드 기준으로 OpenSearch 연결 구조는 붙어 있습니다.

확인된 것:

- Docker로 OpenSearch 서버 실행 가능
- `http://localhost:9200` 응답 확인
- Supabase 실제 `items` 데이터 10,000개를 OpenSearch에 동기화 확인
- 일반 상품 검색과 케이스 검색 분리 동작 확인
- FastAPI 검색 API에 OpenSearch 우선 검색 + 기존 검색 fallback 구조 추가

운영/배포에서 필요한 것:

- EC2에서 Docker로 OpenSearch 실행
- FastAPI `.env`에 `HAMA_OPENSEARCH_ENABLED=true` 설정
- 크롤링 후 Supabase 저장이 끝나면 `python -m opensearch.sync_from_supabase` 실행
- 외부에는 FastAPI만 열고, OpenSearch 9200 포트는 서버 내부 접근으로 제한

## 실행 방법

먼저 Docker Desktop을 켭니다.

그 다음 백엔드 폴더 기준으로 OpenSearch Docker를 실행합니다.

```bash
cd /Users/wooojin/HamaMain_opensearch/code/backend
docker compose -f opensearch/docker-compose.yml up -d
```

OpenSearch 서버가 켜졌는지 확인합니다.

```bash
curl http://localhost:9200
```

Supabase `.env`가 준비되어 있다면, DB 상품을 OpenSearch에 넣습니다.

```bash
cd /Users/wooojin/HamaMain_opensearch/code/backend
PYTHONPATH="$PWD:$PWD/src/main/python" python3 -m opensearch.sync_from_supabase --recreate
```

기본 실행은 Supabase `items` 전체를 페이지 단위로 읽어 색인합니다.
테스트처럼 일부만 넣고 싶을 때만 `--limit`을 붙입니다.

```bash
PYTHONPATH="$PWD:$PWD/src/main/python" python3 -m opensearch.sync_from_supabase --recreate --limit 1000
```

동기화된 문서 수를 확인합니다.

```bash
curl http://localhost:9200/hama_items/_count
```

OpenSearch 검색을 켜고 FastAPI 서버를 실행합니다.

```bash
HAMA_OPENSEARCH_ENABLED=true uvicorn api_server:app --reload
```

## 기본값은 왜 꺼져 있나요?

`.env.example`에서는 `HAMA_OPENSEARCH_ENABLED=false`가 기본값입니다.

이유는 안전장치입니다.

OpenSearch 서버가 안 떠 있거나 인덱스가 아직 비어 있어도, 기존 검색 API가 망가지면 안 됩니다.
그래서 기본 상태에서는 기존 Python/Supabase 검색을 그대로 사용합니다.

OpenSearch를 실제로 쓰고 싶을 때만 다음처럼 켭니다.

```bash
HAMA_OPENSEARCH_ENABLED=true
```

## 검색 로직

OpenSearch는 여러 필드를 동시에 검색합니다.
대신 모든 필드를 똑같이 보지 않고, 중요한 필드에 더 높은 점수를 줍니다.

```text
canonical_name^5      표준 상품명, 가장 중요
title^4               실제 상품 제목
matched_keywords^3    크롤링/매칭 과정에서 붙은 키워드
normalized_title^2    정규화된 제목
search_text           위 내용을 합친 보조 검색 텍스트
```

예를 들어 사용자가 `아이폰 16 프로`를 검색하면, 단순히 제목에 글자가 포함되어 있는지만 보는 것이 아니라
표준 상품명과 매칭 키워드까지 함께 보고 점수를 계산합니다.

## 필터링 로직

기본 검색에서는 이런 후보를 제외합니다.

- `noise_candidate`: 삽니다, 매입, 광고, 대여처럼 판매 상품이 아닐 가능성이 있는 글
- `invalid_price`: 가격이 0원이거나 잘못된 가격
- `accessory_candidate`: 케이스, 필름, 충전기 같은 악세서리 후보

다만 사용자가 직접 `케이스`, `필름`처럼 악세서리를 검색하면 악세서리 후보를 다시 포함합니다.

예시:

```text
검색어: 아이폰 16 프로
-> 케이스 후보 제외

검색어: 아이폰 16 프로 케이스
-> 케이스 후보 포함
```

## 정렬 방식

프론트에서 보내는 정렬값과 맞춰져 있습니다.

- `relevance`
  OpenSearch 점수순입니다. 검색어와 가장 잘 맞는 상품이 위로 옵니다.

- `recent`
  `crawled_at` 기준 최신순입니다.

- `low-price`
  `current_price` 기준 낮은 가격순입니다.

## 발표 때 설명할 핵심 문장

OpenSearch는 Hama의 검색 품질과 속도를 개선하기 위한 검색 서버입니다.
하지만 상품 데이터의 기준은 Supabase DB입니다.

검색할 때는 OpenSearch가 먼저 좋은 후보의 `item_id`를 찾고,
FastAPI가 그 `item_id`로 Supabase에서 실제 상품 정보를 다시 가져와 프론트에 전달합니다.

이렇게 나누면 검색 성능은 OpenSearch가 맡고, 가격/상태/이미지 같은 데이터 정합성은 DB가 맡게 됩니다.
