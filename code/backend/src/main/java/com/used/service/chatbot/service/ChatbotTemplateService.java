package com.used.service.chatbot.service;

import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ChatbotTemplateService {

    public Optional<TemplateAnswer> findAnswer(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return Optional.empty();
        }

        String text = normalize(userMessage);

        if (isServiceIntroQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "SERVICE_INTRO",
                    "TEMPLATE",
                    "하마는 여러 중고거래 사이트의 상품 정보를 모아서 가격 비교, 상품 검색, 추천을 도와주는 서비스입니다. 검색한 상품의 현재가와 최저가, 유사 상품의 평균 가격을 함께 확인할 수 있어 더 합리적으로 구매 판단을 할 수 있습니다."
            ));
        }

        if (isSearchHelpQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "SEARCH_HELP",
                    "TEMPLATE",
                    "검색창에 상품명이나 모델명을 입력하면 관련 중고 상품을 찾을 수 있습니다. 예를 들어 '아이폰 14', '갤럭시 S23', 'RTX 4060 본체'처럼 구체적으로 입력하면 더 정확한 결과를 확인할 수 있습니다."
            ));
        }

        if (isPriceCompareGuideQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "PRICE_COMPARE_GUIDE",
                    "TEMPLATE",
                    "가격 비교는 현재 판매가, 최저가, 비슷한 상품의 평균 매물가와 거래완료 평균가를 기준으로 판단합니다. 상품 상세에서 살래말래 AI를 누르면 해당 상품 기준으로 가격이 괜찮은지 확인할 수 있습니다."
            ));
        }

        if (isWishlistGuideQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "WISHLIST_GUIDE",
                    "TEMPLATE",
                    "상품 상세 화면의 하트 버튼을 누르면 찜 목록에 저장됩니다. 저장한 상품은 마이페이지의 찜 목록에서 다시 확인할 수 있고, 챗봇에서 찜 목록 상품 비교에도 활용할 수 있습니다."
            ));
        }

        if (isRecentItemGuideQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "RECENT_ITEM_GUIDE",
                    "TEMPLATE",
                    "상품 상세를 열어본 내역은 최근 본 상품에 저장됩니다. 마이페이지에서 최근 본 상품을 확인할 수 있고, 챗봇에게 최근 본 상품끼리 비교해 달라고 요청할 수 있습니다."
            ));
        }

        if (isAlertGuideQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "PRICE_ALERT_GUIDE",
                    "TEMPLATE",
                    "상품 상세 화면의 알림 버튼을 누르면 관심 상품 알림 목록에 저장됩니다. 이후 마이페이지 알림 탭에서 알림 대상 상품을 확인할 수 있습니다."
            ));
        }

        if (isChatbotHelpQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "CHATBOT_HELP",
                    "TEMPLATE",
                    "챗봇은 상품 추천, 가격 비교, 찜 목록과 최근 본 상품 비교, 사이트 사용 방법 안내를 도와줍니다. 상품과 무관한 질문은 처리하지 않고, 필요한 경우 상품명이나 조건을 다시 물어봅니다."
            ));
        }

        if (isAuthGuideQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "AUTH_GUIDE",
                    "TEMPLATE",
                    "로그인하면 찜 목록, 최근 본 상품, 알림, 챗봇 상담 내역 같은 개인 기능을 사용할 수 있습니다. 회원가입 후 로그인하면 마이페이지에서 개인 상품 내역을 확인할 수 있습니다."
            ));
        }

        if (isOutOfScopeQuestion(text)) {
            return Optional.of(new TemplateAnswer(
                    "OUT_OF_SCOPE",
                    "OUT_OF_SCOPE",
                    "하마 챗봇은 중고 상품 검색, 가격 비교, 상품 추천, 사이트 사용 방법에 관한 질문만 도와드릴 수 있습니다. 상품명이나 가격 비교 조건을 포함해서 다시 질문해 주세요."
            ));
        }

        return Optional.empty();
    }

    private boolean isServiceIntroQuestion(String text) {
        return containsAny(text, "하마", "서비스", "사이트", "뭐하는", "설명")
                && containsAny(text, "뭐", "소개", "기능", "사용", "알려");
    }

    private boolean isSearchHelpQuestion(String text) {
        return containsAny(text, "검색", "찾는법", "찾기", "상품찾")
                && containsAny(text, "방법", "어떻게", "사용", "하는법");
    }

    private boolean isPriceCompareGuideQuestion(String text) {
        return containsAny(text, "가격비교", "비교", "최저가", "평균가", "살래말래")
                && containsAny(text, "방법", "기준", "어떻게", "판단", "설명");
    }

    private boolean isWishlistGuideQuestion(String text) {
        return containsAny(text, "찜", "하트", "관심")
                && containsAny(text, "방법", "어떻게", "목록", "저장", "확인");
    }

    private boolean isRecentItemGuideQuestion(String text) {
        return containsAny(text, "최근본", "최근열람", "본상품")
                && containsAny(text, "방법", "어떻게", "확인", "목록", "비교");
    }

    private boolean isAlertGuideQuestion(String text) {
        return containsAny(text, "알림", "가격알림", "종")
                && containsAny(text, "방법", "어떻게", "설정", "등록", "확인");
    }

    private boolean isChatbotHelpQuestion(String text) {
        return containsAny(text, "챗봇", "ai", "상담")
                && containsAny(text, "기능", "뭐", "도움", "질문", "사용");
    }

    private boolean isAuthGuideQuestion(String text) {
        return containsAny(text, "로그인", "회원가입", "계정", "마이페이지")
                && containsAny(text, "방법", "필요", "어떻게", "사용", "안돼");
    }

    private boolean isOutOfScopeQuestion(String text) {
        if (containsAny(text, "상품", "가격", "중고", "검색", "추천", "찜", "알림", "하마", "챗봇", "마이페이지", "아이폰", "갤럭시", "노트북", "컴퓨터", "자전거", "의류", "신발", "가구", "카메라", "게임")) {
            return false;
        }

        return containsAny(text, "날씨", "음식", "맛집", "여행", "연예", "주식", "코인", "정치", "뉴스", "숙제", "번역", "소설", "영화", "운세");
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
        return text.toLowerCase()
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
