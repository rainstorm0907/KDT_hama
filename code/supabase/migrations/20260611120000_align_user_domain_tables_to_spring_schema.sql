-- Spring(8001) 백엔드 DB 통합: 별도 Supabase 프로젝트에 있던 user 도메인을
-- 메인 프로젝트(FastAPI와 동일한 Supabase)로 합치면서, user 도메인 테이블을
-- 라이브 Spring 엔티티(docs/db_schema.sql 설계)와 일치하도록 재구성한다.
--
-- 배경:
--   - 기존 public.users 등은 docs/supabase_schema.sql 설계(uuid PK, auth.users 연계,
--     password 컬럼 없음)였으나 해당 설계를 쓰는 코드가 없었음 (전부 0행).
--   - Spring 엔티티는 bigint PK + 시퀀스 + password 컬럼 + 'Y'/'N' 플래그를 사용.
--   - items/platforms/price_history 등 FastAPI 테이블은 변경 없음.
-- 적용: 2026-06-11, Supabase 프로젝트 kgpkcvuawbpgdcyykfdk (MCP migration
--       'align_user_domain_tables_to_spring_schema'로 적용 완료된 내용의 기록본)

BEGIN;

DROP POLICY IF EXISTS "users insert own search events" ON public.search_events;
DROP POLICY IF EXISTS "users manage own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "users read own preferences" ON public.user_preferences;
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
ALTER TABLE public.search_events DROP CONSTRAINT IF EXISTS search_events_user_id_fkey;

DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.notification_settings CASCADE;
DROP TABLE IF EXISTS public.keyword_alerts CASCADE;
DROP TABLE IF EXISTS public.item_views CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.chat_faq CASCADE;
DROP TABLE IF EXISTS public.recommended_items CASCADE;
DROP TABLE IF EXISTS public.search_logs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE SEQUENCE IF NOT EXISTS public.user_seq;
CREATE SEQUENCE IF NOT EXISTS public.wishlist_seq;
CREATE SEQUENCE IF NOT EXISTS public.item_view_seq;
CREATE SEQUENCE IF NOT EXISTS public.notification_seq;
CREATE SEQUENCE IF NOT EXISTS public.notification_setting_seq;
CREATE SEQUENCE IF NOT EXISTS public.keyword_alert_seq;
CREATE SEQUENCE IF NOT EXISTS public.chat_history_seq;
CREATE SEQUENCE IF NOT EXISTS public.chat_faq_seq;
CREATE SEQUENCE IF NOT EXISTS public.recommended_items_seq;
CREATE SEQUENCE IF NOT EXISTS public.search_log_seq;

CREATE TABLE public.users (
    user_id             bigint PRIMARY KEY DEFAULT nextval('user_seq'),
    login_id            varchar NOT NULL UNIQUE,
    email               varchar NOT NULL UNIQUE,
    password            varchar NOT NULL,
    name                varchar NOT NULL,
    birth_date          date,
    nickname            varchar NOT NULL UNIQUE,
    privacy_agreed_at   timestamp NOT NULL DEFAULT now(),
    marketing_agreed_at timestamp,
    account_status      varchar NOT NULL DEFAULT 'ACTIVE',
    created_at          timestamp NOT NULL DEFAULT now(),
    updated_at          timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.wishlists (
    wish_id         bigint PRIMARY KEY DEFAULT nextval('wishlist_seq'),
    user_id         bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_id         bigint NOT NULL REFERENCES public.items(item_id) ON DELETE CASCADE,
    target_price    bigint CHECK (target_price IS NULL OR target_price >= 0),
    is_lowest_alert varchar NOT NULL DEFAULT 'Y',
    added_at        timestamp NOT NULL DEFAULT now(),
    CONSTRAINT uq_wishlists_user_item UNIQUE (user_id, item_id)
);

CREATE TABLE public.notifications (
    notification_id   bigint PRIMARY KEY DEFAULT nextval('notification_seq'),
    user_id           bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_id           bigint REFERENCES public.items(item_id) ON DELETE SET NULL,
    notification_type varchar NOT NULL,
    title             varchar NOT NULL,
    message           varchar,
    payload           text,
    is_read           varchar NOT NULL DEFAULT 'N',
    send_status       varchar NOT NULL DEFAULT 'PENDING',
    created_at        timestamp NOT NULL DEFAULT now(),
    sent_at           timestamp,
    read_at           timestamp
);

CREATE TABLE public.notification_settings (
    setting_id           bigint PRIMARY KEY DEFAULT nextval('notification_setting_seq'),
    user_id              bigint NOT NULL UNIQUE REFERENCES public.users(user_id) ON DELETE CASCADE,
    lowest_price_enabled varchar NOT NULL DEFAULT 'Y',
    sold_status_enabled  varchar NOT NULL DEFAULT 'Y',
    new_item_enabled     varchar NOT NULL DEFAULT 'Y',
    updated_at           timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.keyword_alerts (
    keyword_alert_id bigint PRIMARY KEY DEFAULT nextval('keyword_alert_seq'),
    user_id          bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    keyword          varchar NOT NULL,
    is_active        varchar NOT NULL DEFAULT 'Y',
    created_at       timestamp NOT NULL DEFAULT now(),
    CONSTRAINT uq_keyword_alerts_user_keyword UNIQUE (user_id, keyword)
);

CREATE TABLE public.item_views (
    view_id   bigint PRIMARY KEY DEFAULT nextval('item_view_seq'),
    user_id   bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_id   bigint NOT NULL REFERENCES public.items(item_id) ON DELETE CASCADE,
    viewed_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_item_views_user_viewed ON public.item_views (user_id, viewed_at DESC);

CREATE TABLE public.chat_history (
    chat_id       bigint PRIMARY KEY DEFAULT nextval('chat_history_seq'),
    user_id       bigint REFERENCES public.users(user_id) ON DELETE SET NULL,
    user_message  text,
    bot_response  text,
    intent        varchar,
    response_type varchar,
    created_at    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_faq (
    faq_id           bigint PRIMARY KEY DEFAULT nextval('chat_faq_seq'),
    question_pattern text,
    answer_text      text
);

CREATE TABLE public.recommended_items (
    recommend_id   bigint PRIMARY KEY DEFAULT nextval('recommended_items_seq'),
    user_id        bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_id        bigint NOT NULL REFERENCES public.items(item_id) ON DELETE CASCADE,
    score          integer,
    recommend_type varchar,
    created_at     timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.search_logs (
    log_id          bigint PRIMARY KEY DEFAULT nextval('search_log_seq'),
    user_id         bigint REFERENCES public.users(user_id) ON DELETE SET NULL,
    keyword         varchar NOT NULL,
    clicked_item_id bigint REFERENCES public.items(item_id) ON DELETE SET NULL,
    created_at      timestamp NOT NULL DEFAULT now()
);

-- 빈 테이블의 uuid user_id를 bigint로 정렬
ALTER TABLE public.search_events ALTER COLUMN user_id TYPE bigint USING NULL;
ALTER TABLE public.search_events ADD CONSTRAINT search_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.user_preferences ALTER COLUMN user_id TYPE bigint USING NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

COMMIT;
