"""analysis/scripts 공통 경로 헬퍼."""
from __future__ import annotations

from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
ANALYSIS_DIR = SCRIPTS_DIR.parent
PYTHON_DIR = ANALYSIS_DIR.parent
DEFAULT_RESULTS_DIR = PYTHON_DIR / "crawling" / "results"
