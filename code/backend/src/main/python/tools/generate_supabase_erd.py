"""Generate Supabase ERD PNG from docs/supabase_schema.sql conventions."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[6]
OUTPUT = ROOT / "docs" / "ERD.drawio.png"

BG = (255, 255, 255)
BOX_FILL = (245, 248, 252)
BOX_BORDER = (47, 84, 150)
HEADER_FILL = (47, 84, 150)
HEADER_TEXT = (255, 255, 255)
BODY_TEXT = (30, 30, 30)
PK_COLOR = (180, 0, 0)
FK_COLOR = (0, 102, 51)
LINE_COLOR = (120, 120, 120)
GROUP_FILL = (250, 250, 250)
GROUP_BORDER = (200, 210, 220)
TITLE_COLOR = (20, 40, 80)

TABLES: dict[str, list[tuple[str, str, str]]] = {
    "auth.users": [
        ("id", "uuid", "PK"),
    ],
    "users": [
        ("user_id", "uuid", "PK/FK"),
        ("email", "text", ""),
        ("nickname", "text", ""),
        ("role", "text", ""),
        ("account_status", "text", ""),
    ],
    "items": [
        ("item_id", "bigint", "PK"),
        ("platform_name", "text", ""),
        ("original_id", "text", ""),
        ("canonical_name", "text", ""),
        ("title", "text", ""),
        ("current_price", "integer", ""),
        ("status", "text", ""),
        ("cluster_product_name", "text", ""),
        ("rating", "numeric(6,2)", ""),
        ("view_count", "integer", ""),
    ],
    "price_history": [
        ("history_id", "bigint", "PK"),
        ("item_id", "bigint", "FK"),
        ("price", "integer", ""),
        ("recorded_at", "date", ""),
    ],
    "wishlists": [
        ("wish_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("item_id", "bigint", "FK"),
        ("target_price", "integer", ""),
        ("is_lowest_alert", "boolean", ""),
        ("is_sold_alert", "boolean", ""),
    ],
    "search_logs": [
        ("log_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("keyword", "text", ""),
        ("clicked_item_id", "bigint", "FK"),
    ],
    "search_rankings": [
        ("rank_id", "bigint", "PK"),
        ("keyword", "text", ""),
        ("search_count", "integer", ""),
        ("platform_name", "text", ""),
        ("period_start", "date", ""),
        ("period_end", "date", ""),
    ],
    "search_events": [
        ("event_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("keyword", "text", ""),
        ("item_id", "bigint", "FK"),
        ("event_type", "text", ""),
        ("relevance_score", "numeric", ""),
    ],
    "item_search_matches": [
        ("match_id", "bigint", "PK"),
        ("item_id", "bigint", "FK"),
        ("keyword", "text", ""),
        ("match_score", "numeric", ""),
        ("match_source", "text", ""),
    ],
    "price_stats_daily": [
        ("stat_id", "bigint", "PK"),
        ("canonical_name", "text", ""),
        ("platform_name", "text", ""),
        ("stat_date", "date", ""),
        ("lowest_price", "integer", ""),
        ("average_price", "numeric", ""),
    ],
    "user_preferences": [
        ("pref_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("preferred_tag", "text", ""),
    ],
    "banners": [
        ("banner_id", "bigint", "PK"),
        ("image_url", "text", ""),
        ("display_order", "integer", ""),
        ("is_active", "boolean", ""),
    ],
    "notifications": [
        ("notification_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("item_id", "bigint", "FK"),
        ("notification_type", "text", ""),
        ("is_read", "boolean", ""),
    ],
    "notification_settings": [
        ("setting_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("lowest_price_enabled", "boolean", ""),
        ("sold_status_enabled", "boolean", ""),
    ],
    "keyword_alerts": [
        ("keyword_alert_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("keyword", "text", ""),
        ("is_active", "boolean", ""),
    ],
    "item_views": [
        ("view_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("item_id", "bigint", "FK"),
        ("viewed_at", "timestamptz", ""),
    ],
    "chat_history": [
        ("chat_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("user_message", "text", ""),
        ("bot_response", "text", ""),
        ("intent", "text", ""),
    ],
    "chat_faq": [
        ("faq_id", "bigint", "PK"),
        ("question_pattern", "text", ""),
        ("answer_text", "text", ""),
    ],
    "recommended_items": [
        ("recommend_id", "bigint", "PK"),
        ("user_id", "uuid", "FK"),
        ("item_id", "bigint", "FK"),
        ("score", "numeric", ""),
        ("recommend_type", "text", ""),
    ],
    "content_pages": [
        ("content_id", "bigint", "PK"),
        ("content_type", "text", ""),
        ("title", "text", ""),
        ("is_active", "boolean", ""),
    ],
}

RELATIONS: list[tuple[str, str, str, str]] = [
    ("auth.users", "id", "users", "user_id"),
    ("items", "item_id", "price_history", "item_id"),
    ("users", "user_id", "wishlists", "user_id"),
    ("items", "item_id", "wishlists", "item_id"),
    ("users", "user_id", "search_logs", "user_id"),
    ("items", "item_id", "search_logs", "clicked_item_id"),
    ("users", "user_id", "search_events", "user_id"),
    ("items", "item_id", "search_events", "item_id"),
    ("items", "item_id", "item_search_matches", "item_id"),
    ("users", "user_id", "user_preferences", "user_id"),
    ("users", "user_id", "notifications", "user_id"),
    ("items", "item_id", "notifications", "item_id"),
    ("users", "user_id", "notification_settings", "user_id"),
    ("users", "user_id", "keyword_alerts", "user_id"),
    ("users", "user_id", "item_views", "user_id"),
    ("items", "item_id", "item_views", "item_id"),
    ("users", "user_id", "chat_history", "user_id"),
    ("users", "user_id", "recommended_items", "user_id"),
    ("items", "item_id", "recommended_items", "item_id"),
]

LAYOUT: dict[str, tuple[int, int]] = {
    "auth.users": (40, 80),
    "users": (40, 200),
    "items": (320, 80),
    "price_history": (620, 80),
    "item_search_matches": (880, 80),
    "price_stats_daily": (1140, 80),
    "wishlists": (40, 430),
    "item_views": (280, 430),
    "recommended_items": (520, 430),
    "search_logs": (760, 430),
    "search_events": (1000, 430),
    "user_preferences": (40, 700),
    "notification_settings": (280, 700),
    "keyword_alerts": (520, 700),
    "notifications": (760, 700),
    "search_rankings": (1000, 700),
    "chat_history": (1240, 700),
    "banners": (1480, 700),
    "chat_faq": (1680, 700),
    "content_pages": (1880, 700),
}

BOX_W = 220
ROW_H = 22
HEADER_H = 30
PAD = 8


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def box_height(table: str) -> int:
    return HEADER_H + len(TABLES[table]) * ROW_H + PAD


def draw_table(draw: ImageDraw.ImageDraw, name: str, x: int, y: int, fonts: dict[str, ImageFont.ImageFont]) -> tuple[int, int, int, int]:
    cols = TABLES[name]
    h = box_height(name)
    draw.rounded_rectangle((x, y, x + BOX_W, y + h), radius=6, fill=BOX_FILL, outline=BOX_BORDER, width=2)
    draw.rectangle((x, y, x + BOX_W, y + HEADER_H), fill=HEADER_FILL)
    draw.text((x + 10, y + 7), name, fill=HEADER_TEXT, font=fonts["header"])

    cy = y + HEADER_H + 4
    for col_name, col_type, tag in cols:
        if "PK" in tag:
            color = PK_COLOR
        elif "FK" in tag:
            color = FK_COLOR
        else:
            color = BODY_TEXT
        label = f"{col_name} : {col_type}"
        if tag:
            label += f"  [{tag}]"
        draw.text((x + 10, cy), label, fill=color, font=fonts["body"])
        cy += ROW_H
    return x, y, x + BOX_W, y + h


def center(rect: tuple[int, int, int, int]) -> tuple[int, int]:
    x1, y1, x2, y2 = rect
    return (x1 + x2) // 2, (y1 + y2) // 2


def side_point(rect: tuple[int, int, int, int], target: tuple[int, int]) -> tuple[int, int]:
    x1, y1, x2, y2 = rect
    cx, cy = center(rect)
    tx, ty = target
    dx, dy = tx - cx, ty - cy
    if abs(dx) > abs(dy):
        return (x2 if dx > 0 else x1, cy)
    return (cx, y2 if dy > 0 else y1)


def main() -> None:
    fonts = {
        "title": load_font(28, bold=True),
        "subtitle": load_font(14),
        "header": load_font(13, bold=True),
        "body": load_font(11),
        "legend": load_font(12),
    }

    canvas_w, canvas_h = 2120, 980
    img = Image.new("RGB", (canvas_w, canvas_h), BG)
    draw = ImageDraw.Draw(img)

    draw.text((40, 20), "Hama Supabase ERD (PostgreSQL)", fill=TITLE_COLOR, font=fonts["title"])
    draw.text(
        (40, 52),
        "public schema + auth.users  |  source: docs/supabase_schema.sql",
        fill=(90, 90, 90),
        font=fonts["subtitle"],
    )

    groups = [
        ("Auth / User", 20, 60, 260, 360),
        ("Item Core", 300, 60, 1180, 360),
        ("User-Item Activity", 20, 390, 1260, 670),
        ("User Settings / Search / Content", 20, 660, 2080, 920),
    ]
    for label, x1, y1, x2, y2 in groups:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=10, fill=GROUP_FILL, outline=GROUP_BORDER, width=1)
        draw.text((x1 + 12, y1 + 8), label, fill=(80, 100, 130), font=fonts["legend"])

    rects: dict[str, tuple[int, int, int, int]] = {}
    for table, (x, y) in LAYOUT.items():
        if table.endswith("_dup"):
            continue
        rects[table] = draw_table(draw, table, x, y, fonts)

    for src_table, src_col, dst_table, dst_col in RELATIONS:
        if src_table not in rects or dst_table not in rects:
            continue
        src_rect = rects[src_table]
        dst_rect = rects[dst_table]
        dst_c = center(dst_rect)
        start = side_point(src_rect, dst_c)
        end = side_point(dst_rect, center(src_rect))
        draw.line([start, end], fill=LINE_COLOR, width=1)
        # arrow head
        ex, ey = end
        sx, sy = start
        if abs(ex - sx) >= abs(ey - sy):
            points = [(ex, ey), (ex - 8, ey - 4), (ex - 8, ey + 4)]
        else:
            points = [(ex, ey), (ex - 4, ey - 8), (ex + 4, ey - 8)] if ey < sy else [(ex, ey), (ex - 4, ey + 8), (ex + 4, ey + 8)]
        draw.polygon(points, fill=LINE_COLOR)

    legend_x, legend_y = 40, 930
    draw.text((legend_x, legend_y), "PK", fill=PK_COLOR, font=fonts["legend"])
    draw.text((legend_x + 40, legend_y), "Primary Key", fill=BODY_TEXT, font=fonts["legend"])
    draw.text((legend_x + 180, legend_y), "FK", fill=FK_COLOR, font=fonts["legend"])
    draw.text((legend_x + 220, legend_y), "Foreign Key", fill=BODY_TEXT, font=fonts["legend"])
    draw.text((legend_x + 400, legend_y), "20 tables", fill=BODY_TEXT, font=fonts["legend"])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUTPUT, format="PNG", optimize=True)
    print(f"Saved ERD to {OUTPUT}")


if __name__ == "__main__":
    main()
