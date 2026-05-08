readme
=======
- 조이름 : 집에가고싶조
- git : https://github.com/shortKDT
- notion : https://suave-kip-fd7.notion.site/KDT-350c2695cef080ec881ad5a86bdd8da8

=======
# 프로젝트 설명

본 프로젝트는 중고거래 플랫폼의 상품 데이터를 수집하고, 사용자의 검색 이력과 찜 정보를 기반으로 상품 검색, 가격 비교, 최저가 알림, 맞춤 추천 기능을 제공하는 웹 서비스입니다.

주요 데이터는 Python 크롤링/전처리 작업을 통해 수집한 뒤 DB에 저장하고, Spring Boot 백엔드가 DB 데이터를 조회하여 React 프론트엔드에 API로 제공합니다.

## 주요 기능

- 회원가입 및 로그인
- 개인 페이지 및 찜 목록 관리
- 찜 상품의 현재 가격, 가격 변동, 역대 최저가 정보 제공
- 가격 갱신 시 최저가 알림 제공
- 검색 키워드 기반 상품 검색
- 검색 결과 상단 가격 대시보드 제공
- 최근 검색어 및 검색 순위 제공
- 최근 검색 결과 기반 맞춤 상품 추천
- 챗봇 기능
- 홈 화면 배너 및 카테고리 제공

## 기술 구성

- Backend: Java, Spring Boot
- Frontend: Vite, React, TypeScript, CSS
- Crawling/Preprocessing: Python
- Database: PostgreSQL 또는 Supabase
- Docs: DB 스키마, ERD, API 명세, 요구사항 문서, 구현 파일 체크리스트

## 프로젝트 진행 일정

- 프로젝트 주제 선정: 완료, 2026/03/23 ~ 2026/03/27
- 시장 조사 및 벤치마킹: 완료, 2026/03/30 ~ 2026/04/03
- 요구사항 정의: 완료, 2026/04/06 ~ 2026/04/10
- DB 설계: 완료, 2026/04/13 ~ 2026/04/23
- 프로젝트 구현: 진행 중, 2026/04/16 ~ 미정
- 배포 및 발표 준비: 시작안함, 일정 미정

## 프로젝트 문서

- [프로젝트 폴더 구조](./docs/project_structure.md#프로젝트-폴더-구조)
- [폴더별 설명](./docs/project_structure.md#폴더별-설명)
- [참고 문서](./docs/project_structure.md#참고-문서)

## 팀원 정보

- **정지원**
  - 역할
      - 팀장
      - Back-end & DB 설계
        - 11개 테이블 아키텍처 설계 및 데이터 명세서(Data Dictionary) 표준화
        - 사용자 검색 로그 기반 맞춤 상품 추천 알고리즘 및 가중치 로직 설계
      - 깃 관리자
        - GitHub 레포지토리 환경 구축 및 SQL 스크립트 형상 관리 총괄
  - GIT URL: https://github.com/jiwon-jung323
- **정우진**
  - 역할
      - 프로젝트 매니저
      - Back-end
        - 플랫폼별(번개장터, 중고나라 등) 데이터 수집 파이프라인 및 중복 매물 방지 로직 설계
        - 시세 추적을 위한 일 단위 가격 데이터 수집 주기 및 저장 구조 최적화
      - Front-end & UI/UX
        - Vite 및 React 기반의 프로젝트 아키텍처 설계 및 최적화된 초기 구조 구축
        - CSS 기반 커스텀 디자인 시스템(컬러셋, 폰트, 그리드) 및 공통 컴포넌트
        - KREAM/Apple 스타일의 미니멀한 UI 구현 및 고도화된 반응형 레이아웃 퍼블리싱
  - GIT URL: https://github.com/rainstorm0907
- **김다은**
  - 역할
      - 프론트엔드
        - Hama 프론트엔드 Vite 앱 구조 구성
        - 홈 화면 컴포넌트(`Header`, `HeroBanner`, `SearchPanel`, `CategoryGrid`, `ProductGrid`, `Footer`) 구현
        - 카테고리/상품 더미 데이터와 타입 정의 분리
  - GIT URL: https://github.com/rlekdm
- **이준호**
  - 역할
      - 백엔드
        - 챗봇 기능 구현(google gemini api 활용)
        - 회원가입 및 로그인 기능 구현
  - GIT URL: https://github.com/dlwnsgh1130
