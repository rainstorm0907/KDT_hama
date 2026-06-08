package com.example.ffff.chatbot.service;

import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ChatbotTemplateService {

    public Optional<TemplateAnswer> findAnswer(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return Optional.empty();
        }

        String normalized = normalize(userMessage);

        if (isServiceIntroQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "SERVICE_INTRO",
                    "TEMPLATE",
                    """
                            하마는 여러 중고거래 사이트의 상품 정보를 한곳에서 비교할 수 있게 도와주는 서비스입니다.
                            상품 검색, 가격 비교, 시세 확인, 맞춤 추천, 찜, 알림 기능을 중심으로 이용할 수 있습니다.
                            """
            ));
        }

        if (isSearchHelpQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "SEARCH_HELP",
                    "TEMPLATE",
                    """
                            검색창에 상품명을 입력하면 여러 중고거래 플랫폼의 상품을 한곳에서 비교할 수 있습니다.
                            예를 들어 '아이폰 14', '갤럭시 S23', '게이밍 노트북'처럼 상품명을 중심으로 검색하면 좋습니다.
                            """
            ));
        }

        if (isPriceCompareGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "PRICE_COMPARE_GUIDE",
                    "TEMPLATE",
                    """
                            하마는 수집된 중고 매물의 현재가, 유사 상품 평균가, 거래완료 평균가를 기준으로 가격을 비교합니다.
                            특정 상품의 상세 화면에서 살래말래 AI를 누르면 현재 가격이 괜찮은지 더 쉽게 확인할 수 있습니다.
                            """
            ));
        }

        if (isWishlistGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "WISHLIST_GUIDE",
                    "TEMPLATE",
                    """
                            상품 상세 화면의 하트 버튼을 누르면 찜 목록에 저장됩니다.
                            저장한 상품은 마이페이지의 찜 목록에서 다시 확인할 수 있고, 챗봇이 찜한 상품을 비교할 때도 활용할 수 있습니다.
                            """
            ));
        }

        if (isRecentItemGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "RECENT_ITEM_GUIDE",
                    "TEMPLATE",
                    """
                            상품 상세 화면을 열어본 상품은 최근 본 상품에 저장됩니다.
                            마이페이지에서 다시 확인할 수 있고, 챗봇에게 최근 본 상품끼리 비교해달라고 요청할 수 있습니다.
                            """
            ));
        }

        if (isAlertGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "PRICE_ALERT_GUIDE",
                    "TEMPLATE",
                    """
                            상품 상세 화면의 알림 버튼을 누르면 해당 상품의 가격 알림 대상으로 저장됩니다.
                            마이페이지 알림 목록에서 알림 대상 상품을 확인할 수 있습니다.
                            """
            ));
        }

        if (isChatbotHelpQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "CHATBOT_HELP",
                    "TEMPLATE",
                    """
                            하마 챗봇은 중고 상품 추천, 가격 비교, 살래말래 판단, 사이트 이용 방법 안내를 도와드립니다.
                            로그인한 사용자의 찜 목록과 최근 본 상품도 비교에 활용할 수 있습니다.
                            """
            ));
        }

        if (isAuthGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "AUTH_GUIDE",
                    "TEMPLATE",
                    """
                            회원가입 후 로그인하면 마이페이지, 찜 목록, 최근 본 상품, 알림, 챗봇 기능을 사용할 수 있습니다.
                            로그인이 되지 않으면 이메일과 비밀번호가 정확한지 먼저 확인해 주세요.
                            """
            ));
        }

        if (isOutOfScopeQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "OUT_OF_SCOPE",
                    "OUT_OF_SCOPE",
                    """
                            죄송하지만 하마 챗봇은 중고 상품 검색, 가격 비교, 상품 추천, 찜, 알림, 사이트 이용 방법에 관한 질문만 도와드릴 수 있습니다.
                            상품명이나 사이트 기능과 관련해서 다시 질문해 주세요.
                            """
            ));
        }

        return Optional.empty();
    }

    private boolean isServiceIntroQuestion(String text) {
        return containsAny(text, "하마", "사이트", "서비스")
                && containsAny(text, "뭐", "무엇", "소개", "설명", "기능", "어떤");
    }

    private boolean isSearchHelpQuestion(String text) {
        return containsAny(text, "검색", "찾는법", "찾는방법", "상품찾기")
                && containsAny(text, "방법", "어떻게", "사용법", "하는법", "잘", "팁");
    }

    private boolean isPriceCompareGuideQuestion(String text) {
        return (containsAny(text, "시세", "가격비교", "평균가", "거래완료평균")
                && containsAny(text, "방법", "어떻게", "뜻", "뭐", "기준", "보는법"))
                || containsAny(text, "살래말래사용법", "살래말래기능");
    }

    private boolean isWishlistGuideQuestion(String text) {
        return containsAny(text, "찜", "관심상품")
                && containsAny(text, "방법", "어떻게", "사용법", "하는법", "추가", "삭제", "목록");
    }

    private boolean isRecentItemGuideQuestion(String text) {
        return containsAny(text, "최근본상품", "최근본", "최근상품", "열람상품")
                && containsAny(text, "방법", "어떻게", "사용법", "어디", "목록", "확인");
    }

    private boolean isAlertGuideQuestion(String text) {
        return containsAny(text, "알림", "가격알림", "최저가알림")
                && containsAny(text, "방법", "어떻게", "사용법", "설정", "켜", "끄", "목록");
    }

    private boolean isChatbotHelpQuestion(String text) {
        return containsAny(text, "챗봇", "ai", "살래말래")
                && containsAny(text, "뭐", "무엇", "기능", "사용법", "할수", "도와");
    }

    private boolean isAuthGuideQuestion(String text) {
        return containsAny(text, "로그인", "회원가입", "가입", "계정")
                && containsAny(text, "방법", "어떻게", "안돼", "안되", "오류", "필요");
    }

    private boolean isOutOfScopeQuestion(String text) {
        if (containsAny(text,
                "상품", "중고", "가격", "시세", "찜", "알림", "검색", "하마", "거래", "매물",
                "판매", "구매", "추천", "비교", "살래말래", "마이페이지", "아이폰", "갤럭시",
                "컴퓨터", "노트북", "데스크탑", "본체", "태블릿", "에어팟", "플스", "닌텐도")) {
            return false;
        }

        return containsAny(text,
                "날씨", "주식", "코인", "로또", "뉴스", "정치", "연예", "맛집", "여행",
                "요리", "레시피", "숙제", "과제", "수학", "번역", "코딩", "파이썬", "자바",
                "의학", "병원", "법률", "변호사", "운세", "사주", "노래", "영화추천", "게임공략");
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) {
                return true;
            }
        }

        return false;
    }

    private String normalize(String text) {
        if (text == null) {
            return "";
        }

        return text
                .toLowerCase()
                .replaceAll("\\s+", "")
                .replace("?", "")
                .replace(".", "")
                .replace(",", "")
                .replace("!", "")
                .replace("~", "")
                .trim();
    }

    public static class TemplateAnswer {

        private final String intent;
        private final String responseType;
        private final String answer;

        public TemplateAnswer(String intent, String responseType, String answer) {
            this.intent = intent;
            this.responseType = responseType;
            this.answer = answer;
        }

        public String getIntent() {
            return intent;
        }

        public String getResponseType() {
            return responseType;
        }

        public String getAnswer() {
            return answer;
        }
    }
}
