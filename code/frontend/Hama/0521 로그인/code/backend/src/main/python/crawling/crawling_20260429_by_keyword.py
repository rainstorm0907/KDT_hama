# -*- coding: utf-8 -*-
"""키워드별 CSV 결과를 따로 저장하는 크롤링 스크립트입니다."""

import json
import random
import re
import time
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests


# --- 설정 및 입력 ---
keyword_file = Path(__file__).with_name("keyword_list.csv")
blacklist_file = Path(__file__).with_name("blacklist_keywords.csv")
result_dir = Path(__file__).with_name("results") / "by_keyword"
keyword_df = pd.read_csv(keyword_file, encoding="utf-8-sig")
keyword_column = "keyword" if "keyword" in keyword_df.columns else keyword_df.columns[0]
keywords = keyword_df[keyword_column].dropna().astype(str).str.strip()
keywords = [keyword for keyword in keywords if keyword]
blacklist_keywords = []
if blacklist_file.exists():
    blacklist_df = pd.read_csv(blacklist_file, encoding="utf-8-sig")
    blacklist_column = "keyword" if "keyword" in blacklist_df.columns else blacklist_df.columns[0]
    blacklist_keywords = blacklist_df[blacklist_column].dropna().astype(str).str.strip()
    blacklist_keywords = [keyword for keyword in blacklist_keywords if keyword]

if not keywords:
    raise ValueError(f"{keyword_file.name} 파일에 조회할 키워드가 없습니다.")

days_limit = 14
limit_date = datetime.now() - timedelta(days=days_limit)
REQUEST_TIMEOUT = 10
MAX_RETRIES = 2
BUNJANG_DELAY_RANGE = (1.0, 1.5)
JOONGNA_DELAY_RANGE = (1.5, 2.5)
KEYWORD_DELAY_RANGE = (2.0, 3.0)
JOONGNA_MAX_PAGES = 10

result_columns = [
    "platform",
    "pid",
    "name",
    "price",
    "status",
    "description",
    "image_url",
    "link",
    "date",
]

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
}


def safe_filename(value):
    return re.sub(r'[\\/:*?"<>|]+', "_", value).strip()


def normalize_search_text(value):
    text = str(value).lower()
    text = re.sub(r"(?<=[a-z0-9])plus\b", " 플러스", text)
    text = re.sub(r"\bplus\b|[+＋]", " 플러스 ", text)
    text = re.sub(r"\bpro\b", " 프로 ", text)
    text = re.sub(r"\bmax\b", " 맥스 ", text)
    text = re.sub(r"\bultra\b", " 울트라 ", text)
    return re.sub(r"\s+", " ", text).strip()


def contains_blacklist_keyword(title):
    normalized_title = normalize_search_text(title)
    return any(normalize_search_text(keyword) in normalized_title for keyword in blacklist_keywords)


def keyword_matches_title(keyword, title):
    normalized_title = normalize_search_text(title)
    normalized_keyword = normalize_search_text(keyword)
    keyword_tokens = re.findall(r"[a-z]+[0-9]+|[가-힣]+|[a-z]+|\d+", normalized_keyword)

    for token in keyword_tokens:
        if re.fullmatch(r"[a-z]+[0-9]+", token):
            if not re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", normalized_title):
                return False
            continue

        if re.fullmatch(r"\d+", token):
            if not re.search(rf"(?<!\d){re.escape(token)}(?!\d)", normalized_title):
                return False
            continue

        if token not in normalized_title:
            return False

    return True


def polite_delay(delay_range):
    time.sleep(random.uniform(*delay_range))


def get_with_retries(url, platform):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as error:
            print(f"{platform} 요청 실패 {attempt}/{MAX_RETRIES}: {error}")
            if attempt < MAX_RETRIES:
                polite_delay((2.0, 4.0))
    return None


def get_bunjang_status(status):
    status_map = {
        "0": "판매중",
        "1": "예약중",
        "2": "거래중",
        "3": "판매완료",
    }
    status = str(status)
    return status_map.get(status, f"상태코드:{status}")


def decode_joongna_text(value):
    try:
        return json.loads(f'"{value}"')
    except Exception:
        return value


def get_joongna_status(state):
    status_map = {
        0: "판매중",
        1: "예약중",
        3: "거래완료",
    }
    return status_map.get(state, f"상태코드:{state}")


def parse_joongna_search_items(html):
    pattern = re.compile(
        r'\{\\"seq\\":(?P<pid>\d+).*?'
        r'\\"price\\":(?P<price>\d+).*?'
        r'\\"url\\":\\"(?P<image_url>.*?)\\".*?'
        r'\\"title\\":\\"(?P<name>.*?)\\",'
        r'\\"state\\":(?P<state>\d+),'
        r'\\"sortDate\\":\\"(?P<date>.*?)\\"',
        re.S,
    )

    items = []
    for match in pattern.finditer(html):
        items.append(
            {
                "pid": match.group("pid"),
                "name": decode_joongna_text(match.group("name")),
                "price": int(match.group("price")),
                "status": get_joongna_status(int(match.group("state"))),
                "image_url": decode_joongna_text(match.group("image_url")),
                "date": match.group("date"),
            }
        )

    return items


def get_bunjang_data(keyword):
    print("⚡ 번개장터 조회 시작...")
    items = []
    page = 0
    while True:
        encoded_keyword = urllib.parse.quote(keyword)
        url = f"https://api.bunjang.co.kr/api/1/find_v2.json?q={encoded_keyword}&order=date&n=100&page={page}"
        res = get_with_retries(url, "번개장터")
        if res is None or res.status_code != 200:
            break
        data = res.json().get("list", [])
        if not data:
            break

        for item in data:
            updated_at = datetime.fromtimestamp(item.get("update_time"))
            if updated_at < limit_date:
                return items

            item_name = item.get("name")
            if contains_blacklist_keyword(item_name):
                continue

            if not keyword_matches_title(keyword, item_name):
                continue

            items.append(
                {
                    "platform": "번개장터",
                    "pid": item.get("pid"),
                    "name": item_name,
                    "price": item.get("price"),
                    "status": get_bunjang_status(item.get("status")),
                    "description": "",
                    "image_url": item.get("product_image"),
                    "link": f"https://m.bunjang.co.kr/products/{item.get('pid')}",
                    "date": updated_at.strftime("%Y-%m-%d %H:%M"),
                }
            )
        page += 1
        polite_delay(BUNJANG_DELAY_RANGE)
    return items


def get_joongna_web_data(keyword):
    print("📦 중고나라 웹 조회 시작...")
    encoded_keyword = urllib.parse.quote(keyword)
    items = []
    page = 1

    while True:
        url = f"https://web.joongna.com/search/{encoded_keyword}?page={page}&excludeSoldOutProductYn=N"
        res = get_with_retries(url, "중고나라")
        if res is None:
            break
        if res.status_code != 200:
            break

        search_items = parse_joongna_search_items(res.text)
        if not search_items:
            break

        for item in search_items:
            item_date = datetime.strptime(item["date"], "%Y-%m-%d %H:%M:%S")

            if item_date and item_date < limit_date:
                continue

            item_name = item["name"]
            if contains_blacklist_keyword(item_name):
                continue

            if not keyword_matches_title(keyword, item_name):
                continue

            items.append(
                {
                    "platform": "중고나라",
                    "pid": item["pid"],
                    "name": item_name,
                    "price": item["price"],
                    "status": item["status"],
                    "description": "",
                    "image_url": item["image_url"],
                    "link": f"https://web.joongna.com/product/{item['pid']}",
                    "date": item_date.strftime("%Y-%m-%d %H:%M") if item_date else "",
                }
            )

        print(f"중고나라 {page}페이지 완료...")
        page += 1
        polite_delay(JOONGNA_DELAY_RANGE)
        if page > JOONGNA_MAX_PAGES:
            break

    return items


def merge_keywords(values):
    keywords = [str(value).strip() for value in values if str(value).strip()]
    return ", ".join(dict.fromkeys(keywords))


def keyword_length(value):
    return len(normalize_search_text(value))


def deduplicate_items(df):
    if df.empty:
        return df

    dedupe_columns = ["platform", "pid"]
    keyword_summary = (
        df.groupby(dedupe_columns)["keyword"]
        .agg(matched_keywords=merge_keywords)
        .reset_index()
    )

    deduplicated_df = (
        df.assign(_keyword_length=df["keyword"].apply(keyword_length))
        .sort_values("_keyword_length", ascending=False, kind="mergesort")
        .drop_duplicates(subset=dedupe_columns, keep="first")
        .drop(columns=["_keyword_length"], errors="ignore")
    )
    return deduplicated_df.merge(keyword_summary, on=dedupe_columns, how="left")


# --- 실행 및 키워드별 저장 ---
now = datetime.now().strftime("%Y%m%d_%H%M")
result_dir.mkdir(parents=True, exist_ok=True)

print("\n조회 키워드 목록")
for idx, keyword in enumerate(keywords, start=1):
    print(f"{idx}. {keyword}")

for keyword in keywords:
    print(f"\n🔎 [{keyword}] 조회 시작")
    bj_data = get_bunjang_data(keyword)
    jn_data = get_joongna_web_data(keyword)

    df = pd.DataFrame(bj_data + jn_data, columns=result_columns)
    df.insert(0, "keyword", keyword)
    df.insert(1, "canonical_name", keyword)
    df = deduplicate_items(df)

    output_path = result_dir / f"통합조회_{safe_filename(keyword)}_{now}.csv"
    df.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"✅ [{keyword}] 총 {len(df)}개 매물 저장 완료: {output_path}")
    print(df.head())

    polite_delay(KEYWORD_DELAY_RANGE)
