# analysis/

DB 적재 전 **데이터 검증·탐색** 코드입니다.

전체 Python 백엔드 구조, 실행 방법, E2E 흐름은 상위 문서를 참고하세요.

→ [`../README.md`](../README.md)

## 이 폴더만 빠르게 볼 때

```text
analysis/
├── notebooks/     # keyword_final.ipynb (최종 파이프라인)
├── scripts/       # 정확성·플랫폼·bracket 분석 CLI
├── handoff/       # import_csv_to_supabase.py 입력 CSV
├── review/        # 중간 검토 CSV
├── results/       # 분석 리포트 (gitignore)
└── archive/       # 레거시 (gitignore)
```
