# Hama 파이프라인 설정 CSV 작성 가이드

이 폴더의 CSV 파일들은 `hama_data_pipeline.py`가 실행될 때 자동으로 로드됩니다.  
상품명 매칭, 카테고리 배정, 제외 토큰 관리를 코드 수정 없이 CSV 수정만으로 조정하기 위한 설정 파일입니다.

공통 규칙:

- CSV는 UTF-8로 저장합니다.
- `enabled` 값이 `1`이면 사용, `0`이면 무시됩니다.
- 여러 토큰은 쉼표(`,`)로 구분합니다.
- 토큰은 대소문자를 크게 신경 쓰지 않아도 됩니다. 파이프라인에서 소문자화 및 공백 제거 후 비교합니다.
- 띄어쓰기 차이를 흡수하기 위해 `아이폰 16 프로`, `아이폰16프로`처럼 자주 나오는 표기는 alias에 같이 넣는 것을 권장합니다.

## `product_token_dictionary.csv`

상품명에서 브랜드, 모델명, 스펙, 옵션 등을 추출하기 위한 Trie 사전입니다.

컬럼:

- `field_name`: 추출 결과에 들어갈 필드명입니다. 권장 값은 `brand`, `model`, `detail`, `spec`, `option`입니다.
- `canonical_value`: 최종 결과에 저장될 표준값입니다.
- `aliases`: 같은 의미로 인식할 표현들입니다. 쉼표로 여러 개 입력합니다.
- `enabled`: 사용 여부입니다.

예시:

```csv
field_name,canonical_value,aliases,enabled
brand,아이폰,"iphone,아이폰",1
model,16 pro,"16pro,16프로,16 pro,16 프로",1
spec,256GB,"256gb,256기가,256g",1
option,자급제,"자급제,공기계",1
```

작성 팁:

- `canonical_value`는 화면/DB에 남겨도 자연스러운 표준명으로 적습니다.
- `aliases`에는 크롤링 데이터에 실제로 자주 등장하는 오타, 영문/한글 혼용, 붙여쓰기 표현을 넣습니다.
- 너무 짧은 토큰은 오탐을 만들 수 있습니다. 예를 들어 `s`, `pro`, `max` 같은 값은 필요한 경우에만 신중히 사용합니다.

## `category_rules.csv`

상품명 매칭 결과 또는 `source_keyword`를 기반으로 최종 카테고리를 결정하는 규칙입니다.

컬럼:

- `category`: 최종 배정할 카테고리명입니다.
- `tokens`: 이 카테고리로 판단할 근거 토큰 목록입니다.
- `enabled`: 사용 여부입니다.

예시:

```csv
category,tokens,enabled
디지털/가전 > 모바일,"아이폰,iphone,갤럭시,galaxy,스마트폰,휴대폰",1
디지털/가전 > 노트북,"맥북,macbook,그램,gram,노트북,laptop",1
```

작성 팁:

- `tokens`에는 `product_token_dictionary.csv`의 `canonical_value`나 alias와 연결되는 표현을 넣습니다.
- 한 상품이 여러 카테고리 규칙에 동시에 걸리면 모호하다고 보고 카테고리 보정이 적용되지 않을 수 있습니다.
- 카테고리 체계는 서비스에서 사용할 표준 경로로 통일합니다. 예: `디지털/가전 > 모바일`

## `token_exclude_list.csv`

정확성 검사와 핵심 토큰 추출 과정에서 제외할 노이즈/낚시성 토큰 목록입니다.

컬럼:

- `token`: 제외할 단어입니다.
- `reason`: 제외 사유입니다. 코드에는 직접 쓰이지 않지만 관리용으로 남깁니다.
- `enabled`: 사용 여부입니다.

예시:

```csv
token,reason,enabled
삽니다,bait_or_noise,1
매입,bait_or_noise,1
광고,bait_or_noise,1
문의,bait_or_noise,1
```

작성 팁:

- 상품 자체를 설명하지 않고 거래 유도나 광고에 가까운 단어를 넣습니다.
- 너무 일반적인 단어를 넣으면 정상 상품까지 필터링될 수 있으니 주의합니다.
- 임시로 제외 여부를 테스트하려면 삭제하지 말고 `enabled`를 `0`으로 바꾸는 편이 안전합니다.

## 수정 후 확인 방법

CSV를 수정한 뒤에는 서버 또는 파이프라인 프로세스를 재시작해야 변경된 사전이 다시 로드됩니다.

간단한 문법 확인:

```powershell
python -m py_compile "code/backend/src/main/python/hama_data_pipeline.py"
```

## 실행 방법

프로젝트 루트(`c:\project\kdtproject\kdtproject`)에서 실행합니다.

필요 패키지 설치:

```powershell
python -m pip install -r "code/backend/src/main/python/requirements.txt"
```

파이프라인 모듈 문법 확인:

```powershell
python -m py_compile "code/backend/src/main/python/hama_data_pipeline.py"
```

수동 기입 전 참고 CSV 생성:

```powershell
python "code/backend/src/main/python/generate_config_reference_csv.py"
```

생성 위치:

```text
code/backend/src/main/python/config/reference/
```

상품명 매칭과 카테고리 배정이 CSV 설정을 읽는지 간단히 확인:

```powershell
python -c "import sys; sys.path.insert(0, r'code/backend/src/main/python'); from hama_data_pipeline import HamaDataPipeline; p=HamaDataPipeline(); item=p.run_pipeline({'platform':'번개장터','pid':'test-1','name':'아이폰 16 pro 256gb 자급제','price':1000000,'status':'판매중','source_keyword':'아이폰 16'}); print(item.category); print(item.matched_keywords)"
```

FastAPI 서버 실행:

```powershell
python -m uvicorn api_server:app --reload --app-dir "code/backend/src/main/python"
```

CSV를 수정한 뒤에는 실행 중인 서버를 재시작해야 변경 내용이 반영됩니다.
