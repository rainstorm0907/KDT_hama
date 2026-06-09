# Hama Backend, Supabase, OpenSearch, EC2 배포 정리

이 문서는 Hama 프로젝트 마무리 단계에서 백엔드, Supabase, OpenSearch, Vercel, EC2가 어떻게 붙어 있는지 팀원이 빠르게 이해할 수 있도록 정리한 문서입니다.

핵심부터 말하면, 지금 구조는 억지로 새 기능을 끼운 것이 아니라 기존 흐름을 유지한 확장입니다.

```text
크롤링/정제
  -> Supabase DB 저장
  -> OpenSearch 검색 색인 생성
  -> FastAPI가 검색 요청 처리
  -> Vercel 프론트가 결과 출력
```

OpenSearch는 DB를 대체하지 않습니다. Supabase가 실제 상품 데이터의 기준이고, OpenSearch는 검색을 빠르고 정확하게 하기 위한 검색용 복사본입니다.

## 1. 현재 배포 주소

### Frontend

```text
https://kdt-hama.vercel.app
```

Vercel alias를 설정해서 기존 Vercel 배포를 `kdt-hama.vercel.app` 주소로 접근할 수 있게 했습니다.

### Backend API

```text
http://<EC2_PUBLIC_IP>:8000
```

EC2에서 FastAPI가 `8000` 포트로 실행됩니다.
EC2를 중지했다가 다시 켜면 자동 할당 public IP가 바뀔 수 있으므로, 실제 배포 시점의 IP를 기준으로 Vercel rewrite를 다시 배포해야 합니다.

EC2는 원본 크롤링 서버가 아닙니다.
원본 CSV 수집, 가격 정규화, 상품명 매칭, Supabase 업로드는 로컬/별도 작업 환경에서 처리하고, EC2는 이미 Supabase에 올라간 정제 데이터를 읽어 FastAPI 응답과 OpenSearch 검색 색인만 담당합니다.

### OpenSearch

```text
http://127.0.0.1:9200
```

OpenSearch는 EC2 내부에서만 접근합니다. 외부에서 `9200`, `9600` 포트로 직접 접속하지 못하게 막아두는 것이 맞습니다.

## 2. 전체 흐름

### 기존 목표

Hama는 중고 상품 가격 비교/검색 서비스입니다.

그래서 중요한 것은 단순히 제목 검색만 잘하는 것이 아니라, 아래 흐름이 안정적으로 이어지는 것입니다.

```text
상품 수집
-> 판매 글 필터링
-> 가격 정규화
-> 상품명/키워드 매칭
-> DB 저장
-> 검색/추천/가격 비교에 사용
```

OpenSearch는 이 흐름 중에서 `DB 저장 이후 검색 단계`에 붙습니다.

### 실제 요청 흐름

사용자가 프론트에서 `갤럭시`를 검색하면 흐름은 이렇게 됩니다.

```text
1. 사용자가 https://kdt-hama.vercel.app 에서 검색
2. 프론트가 /api/products/search?q=갤럭시 호출
3. Vercel rewrite가 요청을 EC2 FastAPI로 전달
4. FastAPI가 OpenSearch에 검색 후보 item_id 요청
5. OpenSearch가 검색 점수가 높은 item_id 목록 반환
6. FastAPI가 Supabase에서 item_id에 해당하는 실제 상품 row 조회
7. FastAPI가 기존 상품 응답 형태로 프론트에 반환
```

중요한 점은 OpenSearch가 최종 상품 데이터를 직접 주지 않는다는 것입니다.

OpenSearch는 `어떤 item_id가 검색어에 잘 맞는지`를 빠르게 찾고, 검색 결과 전체 기준의 최저가/평균가 요약을 계산합니다. 상품명, 가격, 이미지, 링크, 가격 이력 같은 실제 출력 데이터는 Supabase에서 다시 가져옵니다.

## 3. 왜 OpenSearch가 검색용 복사본을 가지는가

OpenSearch는 DB를 실시간으로 바라보는 도구가 아닙니다.

검색 엔진은 빠른 검색을 위해 내부에 `색인(index)`을 만듭니다. 쉽게 말하면, 책 뒤쪽의 찾아보기 표처럼 단어와 문서를 미리 연결해 둡니다.

Supabase에 상품이 이렇게 있다면:

```text
items
- item_id
- title
- current_price
- status
- thumbnail_url
- item_url
- canonical_name
- matched_keywords
```

OpenSearch에는 검색에 필요한 일부 필드만 복사합니다.

```text
hama_items index
- item_id
- title
- normalized_title
- canonical_name
- matched_keywords
- search_text
- current_price
- platform
- quality_flags
- crawled_at
```

즉, 원본 크롤링 데이터 전체를 복제하는 것이 아닙니다. 검색에 필요한 가벼운 문서만 따로 만드는 구조입니다.

중고 상품은 일반 쇼핑몰 상품처럼 가격이 계속 실시간으로 바뀌는 구조가 아닙니다. 그래서 매일 00시에 크롤링/정제를 끝낸 뒤 전체 색인을 다시 만드는 방식이 가장 단순하고 발표하기에도 설명하기 쉽습니다.

## 4. Supabase의 역할

Supabase는 서비스 데이터의 기준입니다.

주요 역할은 아래와 같습니다.

```text
items
  상품의 현재 상태, 제목, 가격, 이미지, 링크, platform_name, cluster_product_name, rating 저장

price_history
  가격 비교와 상세 화면용 가격 이력 저장

search_logs, search_events
  OpenSearch 검색 품질 분석용 행동 로그 (검색 키워드, 클릭, 노출 이벤트)
```

정리하면 Supabase는 `정답 DB`입니다.

OpenSearch에서 검색 결과가 나와도, 최종 응답은 Supabase의 `items`를 다시 조회해서 만듭니다. 이렇게 해야 가격, 이미지, 링크, 상태 같은 데이터 기준이 한 곳으로 유지됩니다.

## 5. OpenSearch의 역할

OpenSearch는 검색 후보를 찾는 역할입니다.

현재 검색에서는 아래 필드에 가중치를 줍니다.

```text
canonical_name^5
title^4
matched_keywords^3
normalized_title^2
search_text
```

의미는 이렇습니다.

```text
canonical_name
  정제/매칭된 대표 상품명입니다. 가장 중요하게 봅니다.

title
  실제 크롤링된 게시글 제목입니다.

matched_keywords
  백엔드 정제 로직에서 붙인 키워드입니다.

normalized_title
  띄어쓰기, 프로/맥스/플러스 같은 표현을 검색하기 좋게 정리한 제목입니다.

search_text
  여러 검색 대상 필드를 합친 보조 검색 텍스트입니다.
```

또한 악세서리나 노이즈 글을 줄이기 위해 `quality_flags`를 사용합니다.

예를 들어 사용자가 `아이폰 15`를 검색했을 때, `아이폰 15 케이스` 같은 글은 본체 상품이 아닐 가능성이 높습니다. 그래서 사용자가 직접 `케이스`, `필름`, `충전기` 같은 의도를 넣지 않은 경우에는 악세서리 후보를 검색 결과에서 제외합니다.

## 6. 연결을 담당하는 파일

### API 서버

```text
code/backend/src/main/python/api_server.py
```

역할:

```text
/api/health
/api/products/search
/api/products/recommended
/api/products/{platform}/{pid}
```

`/api/products/search`에서 OpenSearch 검색을 먼저 시도합니다.

OpenSearch가 가능하면:

```text
OpenSearch 검색
-> item_id 목록 획득
-> Supabase에서 실제 상품 조회
-> 프론트 응답
```

OpenSearch가 꺼져 있거나 실패하면 기존 Python 검색으로 fallback합니다.

### Supabase 연결

```text
code/backend/src/main/python/supabase_repository.py
```

역할:

```text
load_products_from_supabase()
  일반 상품 목록 조회

find_product_from_supabase()
  상세 페이지용 단일 상품 조회

find_products_by_item_ids_from_supabase()
  OpenSearch가 찾은 item_id 목록을 실제 상품 응답으로 변환

load_item_rows_for_opensearch()
  OpenSearch 색인을 만들기 위해 Supabase items를 페이지 단위로 읽음
```

Supabase 키는 프론트에 두지 않습니다. FastAPI 서버에서만 `SUPABASE_SERVICE_ROLE_KEY`를 사용합니다.

### OpenSearch 검색 연결

```text
code/backend/opensearch/repository.py
```

역할:

```text
OpenSearch client 생성
검색 query body 생성
검색 결과에서 item_id 추출
index 생성/삭제
bulk 색인
```

환경변수로 OpenSearch 사용 여부를 제어합니다.

```text
HAMA_OPENSEARCH_ENABLED=true
HAMA_OPENSEARCH_URL=http://localhost:9200
HAMA_OPENSEARCH_INDEX=hama_items
```

### OpenSearch 문서 변환

```text
code/backend/opensearch/documents.py
```

역할:

```text
Supabase items row
-> 검색용 OpenSearch document
```

여기서 제목 정규화, 악세서리 후보, 노이즈 후보, 가격 이상치 플래그 같은 검색 품질용 값이 만들어집니다.

### Supabase -> OpenSearch 전체 색인

```text
code/backend/opensearch/sync_from_supabase.py
```

역할:

```text
Supabase items 전체 조회
-> OpenSearch document 변환
-> hama_items index 생성/갱신
```

일일 크롤링 이후 실행하기 좋은 명령입니다.

```bash
cd /home/ubuntu/main/code/backend/src/main/python
PYTHONPATH="/home/ubuntu/main/code/backend:/home/ubuntu/main/code/backend/src/main/python" .venv/bin/python -m opensearch.sync_from_supabase --recreate
```

`--recreate`는 기존 검색 색인을 지우고 다시 만드는 옵션입니다.

우리 프로젝트에서는 중고 상품 데이터가 실시간 가격 변동을 강하게 요구하지 않으므로, 하루 1회 전체 재색인이 가장 단순하고 안정적인 방식입니다.

### OpenSearch Docker

```text
code/backend/opensearch/docker-compose.yml
```

역할:

```text
EC2 내부에서 OpenSearch 컨테이너 실행
9200, 9600 포트를 127.0.0.1에만 바인딩
OpenSearch 데이터를 Docker volume에 저장
```

현재 설정은 외부 공개용이 아니라 FastAPI가 같은 EC2 안에서만 호출하는 구조입니다.

### EC2 배포 보조 파일

```text
code/backend/deploy/ec2_bootstrap.sh
code/backend/deploy/hama-fastapi.service.example
```

역할:

```text
ec2_bootstrap.sh
  EC2에 Docker, Python 실행 환경, swap 등을 준비하는 참고 스크립트

hama-fastapi.service.example
  FastAPI를 systemd 서비스로 계속 실행하기 위한 예시 파일
```

### Vercel API rewrite

```text
code/frontend/Hama/vercel.example.json
```

역할:

```text
/api/:path*
  -> http://<EC2_PUBLIC_IP>:8000/api/:path*
```

프론트 코드는 기존처럼 `/api/products/search`를 호출합니다. 배포 환경에서는 Vercel이 이 요청을 EC2 FastAPI로 넘깁니다.
실제 `vercel.json`은 현재 EC2 public IP가 들어가는 로컬/배포 설정 파일이라 GitHub에는 올리지 않고, `vercel.example.json`만 공유합니다.

## 7. 현재 확인된 연결 상태

현재 기준으로 확인된 값은 아래와 같습니다.

```text
Frontend
  https://kdt-hama.vercel.app

FastAPI
  http://<EC2_PUBLIC_IP>:8000

OpenSearch
  EC2 내부 localhost:9200

OpenSearch index
  hama_items

색인 문서 수
  30,177개

갤럭시 검색 결과 수
  10,789개
```

확인 명령:

```bash
curl https://kdt-hama.vercel.app/api/health
```

기대 응답:

```json
{
  "status": "ok",
  "dataSource": "supabase",
  "searchSource": "opensearch"
}
```

검색 확인:

```bash
curl "https://kdt-hama.vercel.app/api/products/search?q=갤럭시&limit=1"
```

응답에 아래 값이 있으면 OpenSearch 검색이 붙은 것입니다.

```json
{
  "searchSource": "opensearch"
}
```

## 8. EC2 비용과 무료 사용량

현재 EC2는 Sydney 리전 `ap-southeast-2` 기준으로 봐야 합니다.

현재 구성:

```text
Instance type
  t3.small

vCPU / RAM
  2 vCPU / 2 GiB

Root disk
  약 29 GiB

Public IPv4
  1개
```

### t3.small 인스턴스 비용

AWS 공식 Price List 기준으로 Sydney 리전 Linux `t3.small`은 시간당 약 `0.0264 USD`입니다.

계속 켜두면 대략:

```text
720시간 기준
  0.0264 * 720 = 19.01 USD / month

730시간 기준
  0.0264 * 730 = 19.27 USD / month
```

### Public IPv4 비용

AWS는 public IPv4 주소에 시간당 요금을 부과합니다.

```text
0.005 USD / hour

730시간 기준
  0.005 * 730 = 3.65 USD / month
```

### EBS 디스크 비용

현재 루트 디스크가 약 `29 GiB`입니다.

Sydney 리전 `gp3` 기준으로 대략:

```text
0.096 USD / GB-month

29 GiB 기준
  29 * 0.096 = 2.78 USD / month
```

AWS Free Tier에서 EBS 30GB가 적용되는 계정이면 이 부분은 무료 한도 안에 들어갈 수 있습니다.

### 무료 크레딧/Free Tier 주의점

AWS Free Tier는 계정 생성일과 현재 크레딧 정책에 따라 달라집니다.

2025년 7월 15일 이전에 만든 계정의 기존 12개월 Free Tier에서는 보통 `t2.micro` 또는 `t3.micro`가 대상입니다. 이 경우 `t3.small`은 무료 대상이 아닐 수 있습니다.

2025년 7월 15일 이후 새 계정은 AWS 문서 기준으로 Free Plan과 최대 200 USD 크레딧 구조가 적용될 수 있고, EC2 Free Tier 대상 인스턴스에 `t3.small`이 포함될 수 있습니다. 다만 실제 차감 여부는 AWS Billing 콘솔에서 확인해야 합니다.

정확한 확인 위치:

```text
AWS Console
-> Billing and Cost Management
-> Free Tier
-> Credits
-> Cost Explorer
```

### 계속 켜두면 대략 얼마인가

무료 한도가 전혀 적용되지 않는다고 가정하면:

```text
t3.small compute
  약 19.27 USD / month

Public IPv4
  약 3.65 USD / month

EBS 29GiB gp3
  약 2.78 USD / month

합계
  약 25.70 USD / month
```

무료 크레딧이 있으면 이 금액이 크레딧에서 차감될 수 있습니다.

### 인스턴스를 멈추면 어떻게 되나

EC2 인스턴스를 Stop 하면:

```text
compute 비용
  멈춤

FastAPI/OpenSearch
  같이 멈춤

EBS 디스크
  남아 있으므로 계속 과금 가능

Public IPv4
  자동 할당 public IP는 보통 해제될 수 있음
  Elastic IP를 따로 잡으면 과금 조건을 확인해야 함
```

즉 발표나 테스트가 없을 때는 EC2를 꺼두는 것이 가장 간단한 비용 절약 방법입니다.

주의할 점은 public IP가 바뀌면 `code/frontend/Hama/vercel.example.json`을 참고해 실제 Vercel rewrite 주소를 새 IP로 다시 배포해야 한다는 것입니다.

## 9. CPU Credit이란

`t3.small`은 burstable instance입니다.

쉽게 말하면 평소에는 낮은 CPU 기준선으로 운영하다가, 필요할 때 잠깐 더 높은 CPU를 쓸 수 있는 인스턴스입니다.

```text
t3.small
  2 vCPU
  2 GiB RAM
  vCPU당 20% baseline
  시간당 24 CPU credits 획득
```

CPU credit 1개는 `vCPU 1개를 100%로 1분 사용`하는 양입니다.

OpenSearch 색인 작업이나 발표 중 검색 요청처럼 짧은 순간 CPU가 튀는 것은 괜찮습니다. 하지만 하루 종일 CPU를 많이 쓰면 credit을 다 쓰거나, T3 Unlimited 설정 때문에 추가 CPU 비용이 붙을 수 있습니다.

부트캠프 프로젝트 기준으로는:

```text
발표/테스트할 때만 EC2 켜기
크롤링 후 전체 색인은 하루 1회만 실행
OpenSearch를 외부 공개하지 않기
```

이 정도가 현실적인 운영 방식입니다.

## 10. 왜 Docker를 쓰는가

Docker를 쓰는 이유는 OpenSearch가 단순 Python 패키지가 아니라 별도의 검색 서버이기 때문입니다.

FastAPI는 Python 앱입니다.

```text
FastAPI
  Python 코드로 실행
```

OpenSearch는 검색 엔진 서버입니다.

```text
OpenSearch
  Java 기반 검색 서버
  자체 포트와 저장소를 가짐
```

OpenSearch를 EC2에 직접 설치할 수도 있지만, 그러면 Java 버전, 서비스 등록, 설정 파일, 데이터 경로를 직접 관리해야 합니다. Docker를 쓰면 아래가 쉬워집니다.

```text
설치/실행 방법이 고정됨
컨테이너 재시작이 쉬움
데이터는 Docker volume으로 유지됨
팀원이 같은 방식으로 재현하기 쉬움
```

그래서 현재 구조는:

```text
FastAPI
  systemd 서비스로 실행

OpenSearch
  Docker 컨테이너로 실행
```

입니다.

## 11. 매일 00시 크롤링 이후 추천 운영 흐름

현재 목표가 실시간 검색보다 가격 비교/매칭 품질이라면 아래 흐름이 가장 단순합니다.

```text
00:00 크롤링 시작
-> 로컬 또는 작업 서버에서 원본 CSV 저장
-> 블랙리스트/가격 정규화/상품명 매칭
-> 정제된 items를 Supabase에 업로드
-> Supabase items 전체를 OpenSearch에 재색인
-> 프론트 검색은 새 색인을 사용
```

전체 재색인 명령:

```bash
cd /home/ubuntu/main/code/backend/src/main/python
PYTHONPATH="/home/ubuntu/main/code/backend:/home/ubuntu/main/code/backend/src/main/python" .venv/bin/python -m opensearch.sync_from_supabase --recreate
```

10만 건 정도까지는 부트캠프 프로젝트 기준으로 전체 재색인이 설명도 쉽고 구현도 단순합니다.

나중에 데이터가 훨씬 많아지면 `updated_at` 기준 증분 색인을 고민할 수 있습니다. 하지만 지금은 증분 동기화 로직을 억지로 만들면 오히려 버그 포인트가 늘어납니다.

## 12. 보안 체크

현재 방향에서 지켜야 할 것은 아래입니다.

```text
Supabase service role key
  프론트에 두지 않기
  EC2 백엔드 .env에만 두기

OpenSearch 9200/9600
  외부 공개하지 않기
  EC2 내부 localhost만 허용

FastAPI 8000
  프론트에서 호출해야 하므로 외부 접근 허용

Vercel
  kdt-hama.vercel.app 주소에서 /api 요청을 EC2로 rewrite
```

현재 OpenSearch Docker는 아래처럼 localhost에만 바인딩되어야 합니다.

```text
127.0.0.1:9200:9200
127.0.0.1:9600:9600
```

이 상태면 외부 사용자가 OpenSearch에 직접 접근할 수 없고, FastAPI만 내부에서 OpenSearch를 호출합니다.

## 13. 무리하게 붙인 구조인가

현재 구조는 무리하게 붙인 구조가 아닙니다.

이유는 세 가지입니다.

첫째, 기존 FastAPI API 계약을 크게 바꾸지 않았습니다.

프론트는 여전히 `/api/products/search`를 호출하고, 응답도 기존 상품 리스트 형태를 유지합니다. 그래서 프론트와 백엔드 사이의 연결이 갑자기 깨질 가능성이 낮습니다.

둘째, Supabase를 기준 DB로 유지했습니다.

OpenSearch에 상품 전체 책임을 넘기지 않았습니다. 검색 후보만 OpenSearch가 찾고, 실제 상품 데이터는 Supabase에서 다시 조회합니다. 이 방식은 검색 엔진을 붙일 때 흔히 쓰는 구조입니다.

셋째, 지금 프로젝트 규모에 맞게 전체 재색인을 선택했습니다.

매일 00시에 크롤링/정제를 하는 구조라면, 복잡한 실시간 동기화보다 전체 재색인이 더 안전합니다. 중고 상품은 가격이 계속 바뀌는 상품 DB가 아니므로 이 선택이 프로젝트 목표와도 맞습니다.

피한 것:

```text
OpenSearch를 외부 공개하는 구조
실시간 증분 동기화를 억지로 구현하는 구조
프론트가 Supabase service role key를 직접 쓰는 구조
OpenSearch 결과만 믿고 Supabase 조회를 생략하는 구조
```

즉, 초기에 이야기했던 방향대로 `크롤링/정제 -> DB 저장 -> 검색 엔진 색인 -> API 검색` 흐름을 유지했습니다.

## 14. 발표 때 설명하기 좋은 한 문장

```text
Hama는 Supabase를 상품 데이터의 기준 DB로 두고, OpenSearch에는 검색에 필요한 필드만 색인해 빠른 후보 검색을 수행합니다. FastAPI는 OpenSearch에서 item_id를 찾은 뒤 Supabase에서 실제 상품 정보를 다시 조회해 프론트에 반환합니다.
```

조금 더 쉽게 말하면:

```text
Supabase는 정답지, OpenSearch는 빠른 찾아보기 표입니다.
```

## 15. 확인 명령 모음

### Vercel 주소 확인

```bash
curl -I https://kdt-hama.vercel.app
```

### Vercel -> FastAPI 연결 확인

```bash
curl https://kdt-hama.vercel.app/api/health
```

### EC2 FastAPI 직접 확인

```bash
curl http://<EC2_PUBLIC_IP>:8000/api/health
```

### 검색 확인

```bash
curl "https://kdt-hama.vercel.app/api/products/search?q=갤럭시&limit=1"
```

### EC2 내부 OpenSearch 확인

```bash
curl http://localhost:9200
curl http://localhost:9200/hama_items/_count
```

### FastAPI 서비스 확인

```bash
sudo systemctl status hama-fastapi
```

### OpenSearch Docker 확인

```bash
sudo docker ps
sudo docker logs hama-opensearch --tail 50
```

### 전체 재색인

```bash
cd /home/ubuntu/main/code/backend/src/main/python
PYTHONPATH="/home/ubuntu/main/code/backend:/home/ubuntu/main/code/backend/src/main/python" .venv/bin/python -m opensearch.sync_from_supabase --recreate
```

## 16. 참고한 공식 문서

- AWS EC2 Free Tier: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html
- AWS T3 instances: https://aws.amazon.com/ec2/instance-types/t3/
- AWS Public IPv4 pricing: https://aws.amazon.com/vpc/pricing/
- AWS EBS pricing: https://aws.amazon.com/ebs/pricing/
- Vercel Deployment Protection: https://vercel.com/docs/deployment-protection
