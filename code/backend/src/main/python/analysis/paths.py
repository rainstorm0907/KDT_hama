"""analysis 폴더 공통 경로 헬퍼 (노트북·스크립트 공유)."""
from __future__ import annotations

from pathlib import Path


def resolve_analysis_dir() -> Path:
    cwd = Path.cwd().resolve()
    if cwd.name == "analysis":
        return cwd
    if cwd.name == "notebooks" and (cwd.parent / "handoff").exists():
        return cwd.parent

    candidate = cwd / "code/backend/src/main/python/analysis"
    if candidate.exists():
        return candidate

    nested = cwd / "analysis"
    if nested.exists() and (nested / "handoff").exists():
        return nested

    return cwd


def resolve_python_dir() -> Path:
    return resolve_analysis_dir().parent
