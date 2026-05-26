-- [1. 사용자 및 보안 관리]
CREATE TABLE Users (
    user_id         NUMBER PRIMARY KEY,
    login_id        VARCHAR2(50) UNIQUE NOT NULL,
    email           VARCHAR2(100) UNIQUE NOT NULL,
    password        VARCHAR2(255) NOT NULL,
    name            VARCHAR2(50) NOT NULL,
    birth_date      DATE,
    nickname        VARCHAR2(50) NOT NULL,
    privacy_agreed_at TIMESTAMP NOT NULL,
    marketing_agreed_at TIMESTAMP,
    account_status  VARCHAR2(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP DEFAULT SYSDATE,
    updated_at      TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT uq_users_nickname UNIQUE (nickname),
    CONSTRAINT uq_users_name_birth UNIQUE (name, birth_date)
);

-- [2. 매물 정보]
CREATE TABLE Items (
    item_id         NUMBER PRIMARY KEY,
    platform_name   VARCHAR2(50) NOT NULL, -- 번개장터, 중고나라 등
    original_id     VARCHAR2(100) NOT NULL,
    canonical_name  VARCHAR2(200) NOT NULL, -- 표준 상품명, 가격 집계 기준
    title           VARCHAR2(300) NOT NULL,
    description     CLOB,
    current_price   NUMBER NOT NULL,
    lowest_price    NUMBER, -- 역대 최저가 저장용
    category_name   VARCHAR2(100), -- 카테고리 분류용
    matched_keywords VARCHAR2(500), -- 크롤링 시 매칭된 키워드 목록
    sale_status     VARCHAR2(20) DEFAULT 'ON_SALE' NOT NULL, -- ON_SALE, RESERVED, SOLD_OUT
    sold_at         TIMESTAMP,
    thumbnail_url   VARCHAR2(500),
    item_url        VARCHAR2(500) NOT NULL,
    url_checked_at  TIMESTAMP,
    url_status      VARCHAR2(20), -- ACTIVE, REDIRECTED, NOT_FOUND
    crawled_at      TIMESTAMP DEFAULT SYSDATE,
    last_seen_at    TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT uq_items_platform_original UNIQUE (platform_name, original_id)
);

-- [3. 시세 그래프 및 알림용 이력]
CREATE TABLE Price_History (
    history_id      NUMBER PRIMARY KEY,
    item_id         NUMBER,
    price           NUMBER NOT NULL,
    title           VARCHAR2(300),
    sale_status     VARCHAR2(20),
    item_url        VARCHAR2(500),
    recorded_at     DATE DEFAULT SYSDATE, -- 일별 시세 추적용
    CONSTRAINT fk_price_history_item FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

-- [4. 개인 페이지 및 알림 (U02~U05)]
CREATE TABLE Wishlists (
    wish_id         NUMBER PRIMARY KEY,
    user_id         NUMBER,
    item_id         NUMBER,
    target_price    NUMBER, -- 사용자 설정 희망 알림가
    is_lowest_alert CHAR(1) DEFAULT 'Y',
    is_sold_alert   CHAR(1) DEFAULT 'Y',
    added_at        TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT fk_wish_user FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_wish_item FOREIGN KEY (item_id) REFERENCES Items(item_id),
    CONSTRAINT uq_wish_user_item UNIQUE (user_id, item_id)
);

-- [5. 홈화면: 검색 로그 및 맞춤 추천]
CREATE TABLE Search_Logs (
    log_id          NUMBER PRIMARY KEY,
    user_id         NUMBER,
    keyword         VARCHAR2(100) NOT NULL, -- 최근 검색 및 검색 순위 원천 데이터
    clicked_item_id NUMBER,
    created_at      TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_logs_item FOREIGN KEY (clicked_item_id) REFERENCES Items(item_id)
);

-- [5-1. 검색 이벤트: 검색/노출/클릭/최근검색어/인기검색어 원천 로그]
CREATE TABLE Search_Events (
    event_id        NUMBER PRIMARY KEY,
    user_id         NUMBER,
    keyword         VARCHAR2(100) NOT NULL,
    platform_name   VARCHAR2(50),
    item_id         NUMBER,
    event_type      VARCHAR2(20) NOT NULL, -- SEARCH, IMPRESSION, CLICK
    result_rank     NUMBER,
    relevance_score NUMBER,
    created_at      TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT fk_search_events_user FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_search_events_item FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

-- [5-2. 검색어와 상품 연결 루트: 정확도순/매칭 근거 제공]
CREATE TABLE Item_Search_Matches (
    match_id        NUMBER PRIMARY KEY,
    item_id         NUMBER NOT NULL,
    keyword         VARCHAR2(100) NOT NULL,
    canonical_name  VARCHAR2(200),
    match_score     NUMBER,
    match_reason    VARCHAR2(500), -- 키워드 매칭, 모델 점수, 수동 라벨 등
    matched_at      TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT fk_item_search_matches_item FOREIGN KEY (item_id) REFERENCES Items(item_id),
    CONSTRAINT uq_item_search_keyword UNIQUE (item_id, keyword)
);

-- [5-3. 상품 조회 이력: 최근 본 상품 및 추천 원천]
CREATE TABLE Item_Views (
    view_id         NUMBER PRIMARY KEY,
    user_id         NUMBER NOT NULL,
    item_id         NUMBER NOT NULL,
    viewed_at       TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT fk_item_views_user FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_item_views_item FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

-- [6. 홈화면: 실시간 검색 순위 집계 (Batch 결과 저장용)]
CREATE TABLE Search_Rankings (
    rank_id         NUMBER PRIMARY KEY,
    keyword         VARCHAR2(100) NOT NULL,
    platform_name   VARCHAR2(50),
    period_start    DATE,
    period_end      DATE,
    search_count    NUMBER DEFAULT 0,
    trend_status    VARCHAR2(10), -- 상승, 하락, 유지
    calculated_at   TIMESTAMP DEFAULT SYSDATE
);

-- [6-1. 기간별 가격 통계 캐시: 최저가/평균가 대시보드 성능용]
CREATE TABLE Price_Stats_Daily (
    stat_id         NUMBER PRIMARY KEY,
    canonical_name  VARCHAR2(200) NOT NULL,
    platform_name   VARCHAR2(50),
    stat_date       DATE NOT NULL,
    lowest_price    NUMBER,
    average_price   NUMBER,
    item_count      NUMBER DEFAULT 0,
    calculated_at   TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT uq_price_stats_daily UNIQUE (canonical_name, platform_name, stat_date)
);

-- [7. 홈화면: 사용자 맞춤 추천 태그]
CREATE TABLE User_Preferences (
    pref_id         NUMBER PRIMARY KEY,
    user_id         NUMBER,
    preferred_tag   VARCHAR2(50), -- 자주 찾는 카테고리/태그 저장
    CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- [8. 홈화면: 배너 관리]
CREATE TABLE Banners (
    banner_id       NUMBER PRIMARY KEY,
    image_url       VARCHAR2(500) NOT NULL,
    link_url        VARCHAR2(500),
    display_order   NUMBER,
    is_active       CHAR(1) DEFAULT 'Y'
);

-- [8-1. 공지사항 및 약관/개인정보처리방침 문서]
CREATE TABLE Content_Pages (
    content_id      NUMBER PRIMARY KEY,
    content_type    VARCHAR2(30) NOT NULL, -- NOTICE, TERMS, PRIVACY
    title           VARCHAR2(200) NOT NULL,
    body            CLOB NOT NULL,
    version         VARCHAR2(30),
    is_active       CHAR(1) DEFAULT 'Y',
    published_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT SYSDATE
);

-- [9. 챗봇: 대화 내역]
CREATE TABLE Chat_History (
    chat_id         NUMBER PRIMARY KEY,
    user_id         NUMBER,
    user_message    CLOB,
    bot_response    CLOB,
    created_at      TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- [10. 챗봇: 자주 묻는 질문 답변셋]
CREATE TABLE Chat_FAQ (
    faq_id          NUMBER PRIMARY KEY,
    question_pattern VARCHAR2(200),
    answer_text     CLOB
);

-- [11. 알림함 및 발송 상태]
CREATE TABLE Notifications (
    notification_id NUMBER PRIMARY KEY,
    user_id         NUMBER NOT NULL,
    item_id         NUMBER,
    notification_type VARCHAR2(30) NOT NULL, -- SOLD_OUT, LOWEST_PRICE, TARGET_PRICE, NOTICE
    title           VARCHAR2(200) NOT NULL,
    message         VARCHAR2(1000),
    payload         CLOB,
    is_read         CHAR(1) DEFAULT 'N',
    send_status     VARCHAR2(20) DEFAULT 'PENDING', -- PENDING, SENT, FAILED, SKIPPED
    created_at      TIMESTAMP DEFAULT SYSDATE,
    sent_at         TIMESTAMP,
    read_at         TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_notifications_item FOREIGN KEY (item_id) REFERENCES Items(item_id)
);

-- [12. 맞춤 추천 상품 연결 테이블]
CREATE TABLE Recommended_Items (
    recommend_id    NUMBER PRIMARY KEY,
    user_id         NUMBER NOT NULL, -- 필수: 대상 유저가 있어야 함
    item_id         NUMBER NOT NULL, -- 필수: 추천할 상품이 있어야 함
    score           NUMBER,          -- 선택: 점수는 없을 수 있음
    recommend_type  VARCHAR2(50),    -- 선택: 사유는 생략 가능
    created_at      TIMESTAMP DEFAULT SYSDATE NOT NULL,
    CONSTRAINT fk_rec_user FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_rec_item FOREIGN KEY (item_id) REFERENCES Items(item_id)
);
