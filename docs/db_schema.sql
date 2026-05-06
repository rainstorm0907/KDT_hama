-- [1. 사용자 및 보안 관리]
CREATE TABLE Users (
    user_id         NUMBER PRIMARY KEY,
    email           VARCHAR2(100) UNIQUE NOT NULL,
    password        VARCHAR2(255) NOT NULL,
    nickname        VARCHAR2(50) NOT NULL,
    account_status  VARCHAR2(20) DEFAULT 'ACTIVE',
    created_at      TIMESTAMP DEFAULT SYSDATE
);

-- [2. 플랫폼 및 매물 정보]
CREATE TABLE Platforms (
    platform_id     NUMBER PRIMARY KEY,
    platform_name   VARCHAR2(50) NOT NULL
);

CREATE TABLE Items (
    item_id         NUMBER PRIMARY KEY,
    platform_id     NUMBER,
    original_id     VARCHAR2(100) NOT NULL,
    title           VARCHAR2(300) NOT NULL,
    current_price   NUMBER NOT NULL,
    lowest_price    NUMBER, -- 역대 최저가 저장용
    category_name   VARCHAR2(100), -- 카테고리 분류용
    thumbnail_url   VARCHAR2(500),
    item_url        VARCHAR2(500) NOT NULL,
    crawled_at      TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT fk_items_platform FOREIGN KEY (platform_id) REFERENCES Platforms(platform_id)
);

-- [3. 시세 그래프 및 알림용 이력]
CREATE TABLE Price_History (
    history_id      NUMBER PRIMARY KEY,
    item_id         NUMBER,
    price           NUMBER NOT NULL,
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
    added_at        TIMESTAMP DEFAULT SYSDATE,
    CONSTRAINT fk_wish_user FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_wish_item FOREIGN KEY (item_id) REFERENCES Items(item_id)
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

-- [6. 홈화면: 실시간 검색 순위 집계 (Batch 결과 저장용)]
CREATE TABLE Search_Rankings (
    rank_id         NUMBER PRIMARY KEY,
    keyword         VARCHAR2(100) NOT NULL,
    search_count    NUMBER DEFAULT 0,
    trend_status    VARCHAR2(10) -- 상승, 하락, 유지
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
