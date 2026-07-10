"""Hama 챗봇 — FastAPI에서 직접 Gemini를 호출하는 경량 구현.

Spring(Java) 챗봇이 EC2에 배포되지 않아, 이미 배포된 FastAPI에 같은 응답 계약
(`{answer, items, intent}`)으로 챗봇을 붙인다. GEMINI_API_KEY 환경변수만 있으면 동작한다.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import requests

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:  # pragma: no cover - dotenv는 선택적
    pass


GEMINI_BASE_URL = "https://generativelanguage.googleapis.com"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_TIMEOUT_SECONDS = 20

# 하마 서비스 맥락을 주입하는 시스템 프롬프트.
SYSTEM_PROMPT = (
    "너는 '하마(Hama)'라는 중고 상품 가격 비교/검색 서비스의 친절한 도우미야. "
    "하마는 번개장터·중고나라 등 여러 중고 플랫폼의 상품을 모아서 검색, 추천, "
    "가격 비교, 찜, 가격 알림 기능을 제공해. "
    "사용자 질문에 한국어 존댓말로, 핵심만 간결하게(보통 2~4문장) 답해. "
    "특정 상품의 시세가 궁금하면 상단 검색창에서 검색하면 같은 모델의 30일 시세 "
    "그래프와 최저/평균가를 볼 수 있다고 안내해. "
    "모르는 사실은 지어내지 말고 솔직히 모른다고 해."
)

FALLBACK_ANSWER = (
    "지금 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요. "
    "상품 시세가 궁금하면 상단 검색창에서 모델명을 검색해 보세요!"
)


def _api_key() -> str:
    return (os.environ.get("GEMINI_API_KEY") or "").strip()


def answer_message(message: str) -> dict[str, Any]:
    """사용자 메시지에 대한 챗봇 응답을 프론트 계약 형태로 반환한다.

    반환: {"answer": str, "items": list, "intent": str}
    """
    text = (message or "").strip()

    if not text:
        return {
            "answer": "무엇을 도와드릴까요? 상품 검색, 가격 비교, 찜, 알림 사용법을 물어보셔도 좋아요!",
            "items": [],
            "intent": "GENERAL",
        }

    api_key = _api_key()
    if not api_key:
        # 키 미설정 시에도 500 대신 안내 메시지로 응답해 UI가 깨지지 않게 한다.
        return {
            "answer": "챗봇이 아직 설정 중이에요. 조금만 기다려 주세요!",
            "items": [],
            "intent": "GENERAL",
        }

    answer = _generate_text(text, api_key)
    return {
        "answer": answer or FALLBACK_ANSWER,
        "items": [],
        "intent": "GENERAL",
    }


def _generate_text(message: str, api_key: str) -> str:
    url = f"{GEMINI_BASE_URL}/v1beta/models/{GEMINI_MODEL}:generateContent"
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": message}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512},
    }

    try:
        response = requests.post(
            url,
            params={"key": api_key},
            json=payload,
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException:
        return ""
    except ValueError:  # JSON 파싱 실패
        return ""

    return _extract_text(data)


def _extract_text(data: dict[str, Any]) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        return ""

    parts = (candidates[0].get("content") or {}).get("parts") or []
    chunks = [part.get("text", "") for part in parts if isinstance(part, dict)]
    return "".join(chunks).strip()
