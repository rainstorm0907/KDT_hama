from __future__ import annotations

from collections.abc import Callable
from time import perf_counter
from typing import TypeVar


T = TypeVar("T")


def format_elapsed_seconds(elapsed_seconds: float) -> str:
    total_seconds = max(0, round(elapsed_seconds))
    minutes, seconds = divmod(total_seconds, 60)
    return f"{minutes}분 {seconds}초"


def run_with_elapsed(callback: Callable[[], T]) -> T:
    started_at = perf_counter()
    try:
        return callback()
    finally:
        elapsed = perf_counter() - started_at
        print()
        print(f"작동 시간: {format_elapsed_seconds(elapsed)}")
