# -*- coding: utf-8 -*-
"""
통합 크롤링 + Oracle DB 저장 스크립트

필요 파일:
- integrated_crawler.py
- 키워드목록.csv

필요 패키지:
py -m pip install requests pandas oracledb
"""

import os
import requests
import pandas as pd
import time
import random
import urllib.parse
import json
import re
import oracledb

from datetime import datetime, timedelta
from pathlib import Path


# =========================================================
# 1. DB 설정
# =========================================================
DB_USER = os.getenv("DB_USER", "insurance")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
DB_DSN = os.getenv("DB_DSN", "localhost:15210/XEPDB1")


# =========================================================
# 2. 크롤링 설정 및 키워드 읽기
# =========================================================
BASE_DIR = Path(__file__).resolve().parent
keyword_file = BASE_DIR / "키워드목록.csv"

if not keyword_file.exists():
    raise FileNotFoundError(
        f"{keyword_file} 파일이 없습니다. crawler 폴더에 키워드목록.csv를 만들어 주세요."
    )

keyword_df = pd.read_csv(keyword_file, encoding="utf-8-sig")

if keyword_df.empty:
    raise ValueError(f"{keyword_file.name} 파일이 비어 있습니다.")

keyword_column = "keyword" if "keyword" in keyword_df.columns else keyword_df.columns[0]
keywords = keyword_df[keyword_column].dropna().astype(str).str.strip()
keywords = [keyword for keyword in keywords if keyword]

if not keywords:
    raise ValueError(f"{keyword_file.name} 파일에 조회할 키워드가 없습니다.")

days_limit = 3
limit_date = datetime.now() - timedelta(days=days_limit)

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
    "normalized_title",
    "brand",
    "model_name",
    "product_type",
    "is_accessory",
    "storage_gb",
    "trade_status",
    "cpu_name",
    "gpu_name",
    "ram_gb",
    "ssd_gb",
    "performance_level",
]

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/110.0.0.0 Safari/537.36"
    )
}


# =========================================================
# 3. 공통 유틸
# =========================================================
def safe_filename(value):
    return re.sub(r'[\\/:*?"<>|]+', "_", value).strip()


def to_int_price(value):
    if value is None:
        return None

    try:
        if isinstance(value, int):
            return value

        value_text = str(value).replace(",", "").strip()

        if not value_text:
            return None

        return int(value_text)

    except Exception:
        return None


def normalize_compact_text(text):
    if not text:
        return ""

    return (
        str(text)
        .lower()
        .replace(" ", "")
        .replace("-", "")
        .replace("_", "")
        .strip()
    )


def normalize_title(title):
    if not title:
        return ""

    text = str(title).lower()

    remove_words = [
        "판매합니다", "판매", "급처", "급매", "팝니다", "팔아요",
        "정품", "미개봉", "풀박", "택포", "상태좋음", "상태 좋음",
        "깨끗", "새상품", "새 상품", "거의새것", "거의 새것",
        "쿨거", "쿨거래", "네고", "직거래", "택배",
        "삽니다", "구매합니다"
    ]

    for word in remove_words:
        text = text.replace(word, "")

    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_brand(title):
    text = normalize_title(title)

    if "아이폰" in text or "iphone" in text:
        return "애플"

    if "갤럭시" in text or "galaxy" in text:
        return "삼성"

    if "에어팟" in text or "airpods" in text:
        return "애플"

    if "맥북" in text or "macbook" in text:
        return "애플"

    if "아이패드" in text or "ipad" in text:
        return "애플"

    if "애플워치" in text or "apple watch" in text:
        return "애플"

    return None


def extract_model_name(title):
    text = normalize_title(title)

    iphone_match = re.search(
        r"아이폰\s*(\d{1,2})\s*(프로맥스|프로\s*맥스|프로|max|미니|mini|plus|플러스)?",
        text
    )

    if iphone_match:
        number = iphone_match.group(1)
        model = iphone_match.group(2)

        result = f"아이폰 {number}"

        if model:
            model = model.replace("프로 맥스", "프로맥스")
            model = model.replace("max", "프로맥스")
            model = model.replace("mini", "미니")
            model = model.replace("plus", "플러스")
            result += f" {model}"

        return result.strip()

    galaxy_match = re.search(
        r"갤럭시\s*(s\d{1,2}|z\s*플립\d*|z\s*폴드\d*|플립\d*|폴드\d*|노트\d*)",
        text
    )

    if galaxy_match:
        model = galaxy_match.group(1)
        model = re.sub(r"\s+", " ", model)
        return f"갤럭시 {model}".strip()

    if "에어팟" in text:
        if "프로" in text:
            return "에어팟 프로"
        if "맥스" in text:
            return "에어팟 맥스"
        if "2세대" in text:
            return "에어팟 2세대"
        if "3세대" in text:
            return "에어팟 3세대"
        return "에어팟"

    if "맥북" in text:
        if "프로" in text:
            return "맥북 프로"
        if "에어" in text:
            return "맥북 에어"
        return "맥북"

    if "아이패드" in text:
        if "프로" in text:
            return "아이패드 프로"
        if "에어" in text:
            return "아이패드 에어"
        if "미니" in text:
            return "아이패드 미니"
        return "아이패드"

    if "애플워치" in text:
        return "애플워치"

    return None


def extract_storage_gb(title):
    text = normalize_title(title)

    match = re.search(r"(\d{2,4})\s*(gb|기가)", text)

    if match:
        value = int(match.group(1))

        if 16 <= value <= 4096:
            return value

    return None


# =========================================================
# 4. PC 사양 추출 / 성능 등급
# =========================================================
def extract_cpu_name(title):
    if not title:
        return None

    text = str(title).lower()

    patterns = [
        r"i[3579][-\s]?\d{3,5}[a-z]*",
        r"ryzen\s?[3579]\s?\d{3,4}[a-z]*",
        r"라이젠\s?[3579]\s?\d{3,4}[a-z]*",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            cpu = match.group(0)
            cpu = re.sub(r"\s+", " ", cpu).strip()
            cpu = cpu.replace("라이젠", "Ryzen")
            return cpu.upper()

    return None


def extract_gpu_name(title):
    if not title:
        return None

    text = str(title).lower()

    patterns = [
        r"rtx\s?\d{4}\s?ti",
        r"rtx\s?\d{4}",
        r"gtx\s?\d{4}\s?ti",
        r"gtx\s?\d{4}",
        r"rx\s?\d{3,4}\s?xt",
        r"rx\s?\d{3,4}",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            return match.group(0).upper().replace(" ", "")

    if "내장그래픽" in text:
        return "내장그래픽"

    if "그래픽카드 없음" in text or "그래픽 없음" in text:
        return "그래픽카드 없음"

    return None


def extract_ram_gb(title):
    if not title:
        return None

    text = str(title).lower().replace(" ", "")

    patterns = [
        r"ram(\d{1,3})gb",
        r"램(\d{1,3})gb",
        r"메모리(\d{1,3})gb",
        r"(\d{1,3})gb램",
        r"(\d{1,3})g램",
        r"(\d{1,3})기가램",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)

        if match:
            value = int(match.group(1))

            if 1 <= value <= 256:
                return value

    return None


def extract_ssd_gb(title):
    if not title:
        return None

    text = str(title).lower().replace(" ", "")

    ssd_match = re.search(r"ssd(\d{2,4})gb", text)

    if ssd_match:
        value = int(ssd_match.group(1))

        if 64 <= value <= 8192:
            return value

    tb_match = re.search(r"(\d{1,2})tb", text)

    if tb_match:
        return int(tb_match.group(1)) * 1024

    return None


def resolve_performance_level(cpu_name, gpu_name, ram_gb):
    gpu = normalize_compact_text(gpu_name or "")
    cpu = normalize_compact_text(cpu_name or "")
    ram = ram_gb or 0

    ultra_gpus = [
        "rtx4090", "rtx4080", "rtx4070ti", "rtx4070",
        "rtx3090", "rtx3080ti", "rtx3080",
        "rx7900xtx", "rx7900xt", "rx7800xt"
    ]

    high_gpus = [
        "rtx4060ti", "rtx4060", "rtx3070", "rtx3060ti", "rtx3060",
        "rtx2080", "rtx2070", "rtx2060",
        "rx6700xt", "rx6600xt", "rx6600"
    ]

    mid_gpus = [
        "gtx1660ti", "gtx1660super", "gtx1660",
        "gtx1650super", "gtx1650",
        "gtx1060", "gtx1050ti",
        "rx580", "rx570"
    ]

    if any(g in gpu for g in ultra_gpus):
        return "ULTRA" if ram >= 32 else "HIGH"

    if any(g in gpu for g in high_gpus):
        return "HIGH" if ram >= 16 else "MID"

    if any(g in gpu for g in mid_gpus):
        return "MID" if ram >= 16 else "LOW"

    if any(word in gpu for word in ["내장그래픽", "uhd", "iris", "vega"]):
        return "LOW"

    if not gpu:
        weak_cpus = [
            "i52500", "i52500k", "i56400", "i54460",
            "i34130", "i36100", "셀러론", "펜티엄"
        ]

        if any(c in cpu for c in weak_cpus):
            return "LOW"

        return "UNKNOWN"

    return "UNKNOWN"


# =========================================================
# 5. 상품 분류 / 거래 상태
# =========================================================
def classify_product(title):
    text = normalize_title(title)

    accessory_rules = [
        ("액정필름", "FILM"),
        ("보호필름", "FILM"),
        ("강화유리", "FILM"),
        ("필름", "FILM"),
        ("케이스", "CASE"),
        ("커버", "CASE"),
        ("범퍼", "CASE"),
        ("충전기", "CHARGER"),
        ("충전선", "CABLE"),
        ("케이블", "CABLE"),
        ("어댑터", "ADAPTER"),
        ("젠더", "ADAPTER"),
        ("거치대", "STAND"),
        ("파우치", "POUCH"),
        ("스트랩", "STRAP"),
        ("맥세이프", "ACCESSORY"),

        ("쿨러", "PARTS"),
        ("파워", "PARTS"),
        ("메인보드", "PARTS"),
        ("그래픽카드 단품", "PARTS"),
        ("부품용", "PARTS"),
        ("부품", "PARTS"),
        ("고장", "PARTS"),
        ("파손", "PARTS"),
        ("액정깨짐", "PARTS"),
        ("액정 깨짐", "PARTS"),
        ("박스", "BOX"),
        ("공박스", "BOX"),
        ("상자", "BOX"),
        ("교환권", "ETC"),
        ("필톡", "ACCESSORY"),
        ("수리", "SERVICE"),
        ("설치", "SERVICE"),
        ("세팅", "SERVICE"),
        ("os세팅", "SERVICE"),
        ("윈도우설치", "SERVICE"),
        ("책상", "FURNITURE"),
        ("의자", "FURNITURE"),
    ]

    for keyword, product_type in accessory_rules:
        if keyword in text:
            return {
                "is_accessory": "Y",
                "product_type": product_type
            }

    if "아이폰" in text or "갤럭시" in text or "스마트폰" in text or "휴대폰" in text:
        return {
            "is_accessory": "N",
            "product_type": "smartphone"
        }

    if "에어팟" in text:
        return {
            "is_accessory": "N",
            "product_type": "earphone"
        }

    if "맥북" in text or "노트북" in text or "랩탑" in text:
        return {
            "is_accessory": "N",
            "product_type": "laptop"
        }

    if "컴퓨터" in text or "데스크탑" in text or "본체" in text or "pc" in text:
        return {
            "is_accessory": "N",
            "product_type": "desktop"
        }

    if "아이패드" in text or "태블릿" in text:
        return {
            "is_accessory": "N",
            "product_type": "tablet"
        }

    if "애플워치" in text:
        return {
            "is_accessory": "N",
            "product_type": "watch"
        }

    return {
        "is_accessory": "N",
        "product_type": "UNKNOWN"
    }


def detect_trade_status_from_status(status):
    if status in ["판매완료", "거래완료", "거래완료됨"]:
        return "SOLD"

    if status in ["예약중", "거래중"]:
        return "RESERVED"

    return "SALE"


def normalize_is_deleted(status):
    if status in ["판매완료", "거래완료", "거래완료됨"]:
        return "Y"

    return "N"


def enrich_item(item):
    title = item.get("name")
    status = item.get("status")

    classification = classify_product(title)

    cpu_name = extract_cpu_name(title)
    gpu_name = extract_gpu_name(title)
    ram_gb = extract_ram_gb(title)
    ssd_gb = extract_ssd_gb(title)
    performance_level = resolve_performance_level(cpu_name, gpu_name, ram_gb)

    item["normalized_title"] = normalize_title(title)
    item["brand"] = extract_brand(title)
    item["model_name"] = extract_model_name(title)
    item["product_type"] = classification["product_type"]
    item["is_accessory"] = classification["is_accessory"]
    item["storage_gb"] = extract_storage_gb(title)

    item["trade_status"] = detect_trade_status_from_status(status)
    item["cpu_name"] = cpu_name
    item["gpu_name"] = gpu_name
    item["ram_gb"] = ram_gb
    item["ssd_gb"] = ssd_gb
    item["performance_level"] = performance_level

    return item


def parse_crawled_at(date_text):
    if not date_text:
        return datetime.now()

    try:
        return datetime.strptime(date_text, "%Y-%m-%d %H:%M")
    except Exception:
        return datetime.now()


def get_connection():
    return oracledb.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        dsn=DB_DSN
    )


def deduplicate_items(items):
    if not items:
        return []

    unique_map = {}

    for item in items:
        platform = item.get("platform")
        pid = item.get("pid")

        if not platform or pid is None:
            continue

        key = (platform, str(pid))
        unique_map[key] = item

    return list(unique_map.values())


# =========================================================
# 6. 플랫폼 / 상품 DB 저장 함수
# =========================================================
def get_or_create_platform_id(cursor, platform_name):
    cursor.execute("""
                   SELECT platform_id
                   FROM Platforms
                   WHERE platform_name = :platform_name
                   """, {
                       "platform_name": platform_name
                   })

    row = cursor.fetchone()

    if row:
        return row[0]

    cursor.execute("""
                   INSERT INTO Platforms (
                       platform_id,
                       platform_name
                   ) VALUES (
                                platform_seq.NEXTVAL,
                                :platform_name
                            )
                   """, {
                       "platform_name": platform_name
                   })

    cursor.execute("""
                   SELECT platform_id
                   FROM Platforms
                   WHERE platform_name = :platform_name
                   """, {
                       "platform_name": platform_name
                   })

    row = cursor.fetchone()

    if not row:
        raise RuntimeError(f"플랫폼 생성 실패: {platform_name}")

    return row[0]


def find_item_id(cursor, platform_id, original_id):
    cursor.execute("""
                   SELECT item_id
                   FROM Items
                   WHERE platform_id = :platform_id
                     AND original_id = :original_id
                   """, {
                       "platform_id": platform_id,
                       "original_id": original_id
                   })

    row = cursor.fetchone()
    return row[0] if row else None


def insert_price_history(cursor, item_id, price):
    if item_id is None or price is None:
        return

    cursor.execute("""
                   SELECT price
                   FROM (
                            SELECT price
                            FROM Price_History
                            WHERE item_id = :item_id
                            ORDER BY recorded_at DESC
                        )
                   WHERE ROWNUM = 1
                   """, {
                       "item_id": item_id
                   })

    row = cursor.fetchone()

    if row and row[0] == price:
        return

    cursor.execute("""
                   INSERT INTO Price_History (
                       history_id,
                       item_id,
                       price,
                       recorded_at
                   ) VALUES (
                                price_history_seq.NEXTVAL,
                                :item_id,
                                :price,
                                SYSTIMESTAMP
                            )
                   """, {
                       "item_id": item_id,
                       "price": price
                   })


def save_items_to_db(items):
    if not items:
        print("DB 저장 대상 없음")
        return

    conn = None
    cursor = None
    saved_count = 0
    skipped_count = 0

    try:
        conn = get_connection()
        cursor = conn.cursor()

        for item in items:
            platform_name = item.get("platform")
            original_id = str(item.get("pid")) if item.get("pid") is not None else None
            title = item.get("name")
            current_price = to_int_price(item.get("price"))
            thumbnail_url = item.get("image_url")
            item_url = item.get("link")
            crawled_at = parse_crawled_at(item.get("date"))

            is_deleted = normalize_is_deleted(item.get("status"))

            normalized_title = item.get("normalized_title")
            brand = item.get("brand")
            model_name = item.get("model_name")
            product_type = item.get("product_type")
            is_accessory = item.get("is_accessory") or "N"
            storage_gb = item.get("storage_gb")

            trade_status = item.get("trade_status") or "SALE"
            cpu_name = item.get("cpu_name")
            gpu_name = item.get("gpu_name")
            ram_gb = item.get("ram_gb")
            ssd_gb = item.get("ssd_gb")
            performance_level = item.get("performance_level") or "UNKNOWN"

            if not platform_name or not original_id or not title or current_price is None or not item_url:
                skipped_count += 1
                continue

            platform_id = get_or_create_platform_id(cursor, platform_name)

            cursor.execute("""
                MERGE INTO Items i
                USING (
                    SELECT
                        :platform_id AS platform_id,
                        :original_id AS original_id,
                        :title AS title,
                        :current_price AS current_price,
                        :thumbnail_url AS thumbnail_url,
                        :item_url AS item_url,
                        :crawled_at AS crawled_at,
                        :is_deleted AS is_deleted,
                        :normalized_title AS normalized_title,
                        :brand AS brand,
                        :model_name AS model_name,
                        :product_type AS product_type,
                        :is_accessory AS is_accessory,
                        :storage_gb AS storage_gb,
                        :trade_status AS trade_status,
                        :cpu_name AS cpu_name,
                        :gpu_name AS gpu_name,
                        :ram_gb AS ram_gb,
                        :ssd_gb AS ssd_gb,
                        :performance_level AS performance_level
                    FROM dual
                ) src
                ON (
                    i.platform_id = src.platform_id
                    AND i.original_id = src.original_id
                )
                WHEN MATCHED THEN
                    UPDATE SET
                        i.title = src.title,
                        i.current_price = src.current_price,
                        i.thumbnail_url = src.thumbnail_url,
                        i.item_url = src.item_url,
                        i.crawled_at = src.crawled_at,
                        i.updated_at = SYSTIMESTAMP,
                        i.is_deleted = src.is_deleted,
                        i.normalized_title = src.normalized_title,
                        i.brand = src.brand,
                        i.model_name = src.model_name,
                        i.product_type = src.product_type,
                        i.is_accessory = src.is_accessory,
                        i.storage_gb = src.storage_gb,
                        i.trade_status = src.trade_status,
                        i.cpu_name = src.cpu_name,
                        i.gpu_name = src.gpu_name,
                        i.ram_gb = src.ram_gb,
                        i.ssd_gb = src.ssd_gb,
                        i.performance_level = src.performance_level,
                        i.lowest_price =
                            CASE
                                WHEN i.lowest_price IS NULL THEN src.current_price
                                WHEN src.current_price < i.lowest_price THEN src.current_price
                                ELSE i.lowest_price
                            END
                WHEN NOT MATCHED THEN
                    INSERT (
                        item_id,
                        platform_id,
                        original_id,
                        title,
                        current_price,
                        lowest_price,
                        category_name,
                        thumbnail_url,
                        item_url,
                        crawled_at,
                        updated_at,
                        is_deleted,
                        normalized_title,
                        brand,
                        model_name,
                        product_type,
                        is_accessory,
                        storage_gb,
                        trade_status,
                        cpu_name,
                        gpu_name,
                        ram_gb,
                        ssd_gb,
                        performance_level
                    ) VALUES (
                        item_seq.NEXTVAL,
                        src.platform_id,
                        src.original_id,
                        src.title,
                        src.current_price,
                        src.current_price,
                        src.product_type,
                        src.thumbnail_url,
                        src.item_url,
                        src.crawled_at,
                        SYSTIMESTAMP,
                        src.is_deleted,
                        src.normalized_title,
                        src.brand,
                        src.model_name,
                        src.product_type,
                        src.is_accessory,
                        src.storage_gb,
                        src.trade_status,
                        src.cpu_name,
                        src.gpu_name,
                        src.ram_gb,
                        src.ssd_gb,
                        src.performance_level
                    )
            """, {
                "platform_id": platform_id,
                "original_id": original_id,
                "title": title,
                "current_price": current_price,
                "thumbnail_url": thumbnail_url,
                "item_url": item_url,
                "crawled_at": crawled_at,
                "is_deleted": is_deleted,
                "normalized_title": normalized_title,
                "brand": brand,
                "model_name": model_name,
                "product_type": product_type,
                "is_accessory": is_accessory,
                "storage_gb": storage_gb,
                "trade_status": trade_status,
                "cpu_name": cpu_name,
                "gpu_name": gpu_name,
                "ram_gb": ram_gb,
                "ssd_gb": ssd_gb,
                "performance_level": performance_level
            })

            item_id = find_item_id(cursor, platform_id, original_id)
            insert_price_history(cursor, item_id, current_price)

            saved_count += 1

        conn.commit()
        print(f"✅ DB 저장 완료: {saved_count}개, 스킵: {skipped_count}개")

    except Exception as e:
        if conn:
            conn.rollback()

        print("❌ DB 저장 중 오류 발생")
        print(e)

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


# =========================================================
# 7. 번개장터 크롤링
# =========================================================
def get_bunjang_status(status):
    status_map = {
        "0": "판매중",
        "1": "예약중",
        "2": "거래중",
        "3": "판매완료",
    }

    status = str(status)
    return status_map.get(status, f"상태코드:{status}")


def get_bunjang_data(keyword):
    print("⚡ 번개장터 조회 시작...")

    items = []
    page = 0

    while True:
        encoded_keyword = urllib.parse.quote(keyword)
        url = (
            "https://api.bunjang.co.kr/api/1/find_v2.json"
            f"?q={encoded_keyword}&order=date&n=100&page={page}"
        )

        try:
            res = requests.get(url, headers=headers, timeout=10)
            res.raise_for_status()
            data = res.json().get("list", [])

        except Exception as e:
            print(f"번개장터 조회 오류: {e}")
            break

        if not data:
            break

        for item in data:
            update_time = item.get("update_time")

            if update_time is None:
                continue

            updated_at = datetime.fromtimestamp(update_time)

            if updated_at < limit_date:
                return items

            price = to_int_price(item.get("price"))

            items.append({
                "platform": "번개장터",
                "pid": item.get("pid"),
                "name": item.get("name"),
                "price": price,
                "status": get_bunjang_status(item.get("status")),
                "description": "",
                "image_url": item.get("product_image"),
                "link": f"https://m.bunjang.co.kr/products/{item.get('pid')}",
                "date": updated_at.strftime("%Y-%m-%d %H:%M")
            })

        page += 1
        time.sleep(random.uniform(1.0, 1.5))

    return items


# =========================================================
# 8. 중고나라 크롤링
# =========================================================
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
        re.S
    )

    items = []

    for match in pattern.finditer(html):
        price = to_int_price(match.group("price"))

        items.append({
            "pid": match.group("pid"),
            "name": decode_joongna_text(match.group("name")),
            "price": price,
            "status": get_joongna_status(int(match.group("state"))),
            "image_url": decode_joongna_text(match.group("image_url")),
            "date": match.group("date"),
        })

    return items


def get_joongna_web_data(keyword):
    print("📦 중고나라 웹 조회 시작...")

    encoded_keyword = urllib.parse.quote(keyword)
    items = []
    page = 1

    while True:
        url = f"https://web.joongna.com/search/{encoded_keyword}?page={page}&excludeSoldOutProductYn=N"

        try:
            res = requests.get(url, headers=headers, timeout=10)

        except Exception as e:
            print(f"중고나라 조회 오류: {e}")
            break

        if res.status_code != 200:
            print(f"중고나라 응답 코드: {res.status_code}")
            break

        search_items = parse_joongna_search_items(res.text)

        if not search_items:
            break

        for item in search_items:
            try:
                item_date = datetime.strptime(item["date"], "%Y-%m-%d %H:%M:%S")
            except Exception:
                item_date = datetime.now()

            if item_date and item_date < limit_date:
                continue

            items.append({
                "platform": "중고나라",
                "pid": item["pid"],
                "name": item["name"],
                "price": item["price"],
                "status": item["status"],
                "description": "",
                "image_url": item["image_url"],
                "link": f"https://web.joongna.com/product/{item['pid']}",
                "date": item_date.strftime("%Y-%m-%d %H:%M") if item_date else ""
            })

        print(f"중고나라 {page}페이지 완료...")
        page += 1
        time.sleep(random.uniform(1.5, 2.5))

        if page > 10:
            break

    return items


# =========================================================
# 9. 실행부
# =========================================================
def main():
    now = datetime.now().strftime("%Y%m%d_%H%M")
    all_dfs = []

    print("\n조회 키워드 목록")

    for idx, keyword in enumerate(keywords, start=1):
        print(f"{idx}. {keyword}")

    for keyword in keywords:
        print(f"\n🔎 [{keyword}] 조회 시작")

        bj_data = get_bunjang_data(keyword)
        jn_data = get_joongna_web_data(keyword)

        merged_items = bj_data + jn_data
        merged_items = [enrich_item(item) for item in merged_items]
        merged_items = deduplicate_items(merged_items)

        df = pd.DataFrame(merged_items, columns=result_columns)
        df.insert(0, "keyword", keyword)
        all_dfs.append(df)

        print(f"중복 제거 후 DB 저장 대상 개수: {len(merged_items)}")
        save_items_to_db(merged_items)

        print(f"✅ [{keyword}] 총 {len(df)}개 매물 수집 완료!")
        print(df.head())

        df.to_csv(
            BASE_DIR / f"통합조회_{safe_filename(keyword)}_{now}.csv",
            index=False,
            encoding="utf-8-sig"
        )

    if all_dfs:
        total_df = pd.concat(all_dfs, ignore_index=True)

        if not total_df.empty:
            total_df["pid"] = total_df["pid"].astype(str)

            total_df = total_df.drop_duplicates(
                subset=["platform", "pid"],
                keep="last"
            )

        total_df.to_csv(
            BASE_DIR / f"통합조회_전체_{now}.csv",
            index=False,
            encoding="utf-8-sig"
        )

        print(f"\n✅ 전체 키워드 중복 제거 후 총 {len(total_df)}개 매물 저장 완료!")
    else:
        print("\n수집된 데이터가 없습니다.")


if __name__ == "__main__":
    main()