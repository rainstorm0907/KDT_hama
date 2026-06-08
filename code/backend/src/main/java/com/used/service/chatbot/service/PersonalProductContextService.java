package com.used.service.chatbot.service;

import com.used.service.chatbot.dto.ChatMessageResponse;
import com.used.service.chatbot.dto.RecommendedItemDto;
import com.used.service.chatbot.entity.Item;
import com.used.service.entity.ItemView;
import com.used.service.entity.User;
import com.used.service.entity.Wishlist;
import com.used.service.repository.ItemViewRepository;
import com.used.service.repository.UserRepository;
import com.used.service.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PersonalProductContextService {

    private final UserRepository userRepository;
    private final WishlistRepository wishlistRepository;
    private final ItemViewRepository itemViewRepository;

    public boolean supports(String message) {
        String normalized = normalize(message);
        boolean asksPersonalContext = containsAny(normalized, "찜", "관심", "최근본", "최근본상품", "본상품");
        boolean asksCompare = containsAny(normalized, "비교", "추천", "가격", "뭐가", "어떤", "괜찮", "살까");
        return asksPersonalContext && asksCompare;
    }

    @Transactional(readOnly = true)
    public ChatMessageResponse handle(Long userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("로그인한 사용자를 찾을 수 없습니다."));

        String sourceName = resolveSourceName(message);
        List<Item> items = "RECENT".equals(sourceName) ? loadRecentItems(user) : loadWishlistItems(user);

        if (items.isEmpty()) {
            String answer = "RECENT".equals(sourceName)
                    ? "최근 본 상품이 아직 없습니다. 상품 상세 페이지를 열어본 뒤 다시 비교를 요청해 주세요."
                    : "찜 목록에 상품이 아직 없습니다. 관심 있는 상품의 하트 버튼을 누른 뒤 다시 비교를 요청해 주세요.";
            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent("PERSONAL_CONTEXT_COMPARE")
                    .responseType("USER_CONTEXT")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        List<RecommendedItemDto> comparedItems = items.stream()
                .sorted(Comparator.comparing(Item::getCurrentPrice, Comparator.nullsLast(Long::compareTo)))
                .limit(5)
                .map(this::toRecommendedItemDto)
                .toList();

        return ChatMessageResponse.builder()
                .answer(makeCompareAnswer(sourceName, comparedItems))
                .intent("PERSONAL_CONTEXT_COMPARE")
                .responseType("USER_CONTEXT")
                .keyword("")
                .items(comparedItems)
                .build();
    }

    private List<Item> loadWishlistItems(User user) {
        return wishlistRepository.findByUserOrderByAddedAtDesc(user).stream().map(Wishlist::getItem).toList();
    }

    private List<Item> loadRecentItems(User user) {
        return itemViewRepository.findTop20ByUserOrderByViewedAtDesc(user).stream().map(ItemView::getItem).toList();
    }

    private String makeCompareAnswer(String sourceName, List<RecommendedItemDto> items) {
        String contextLabel = "RECENT".equals(sourceName) ? "최근 본 상품" : "찜 목록";
        if (items.size() == 1) {
            RecommendedItemDto item = items.get(0);
            return contextLabel + "에 비교할 상품이 1개만 있습니다. 현재 후보는 '" + item.getTitle() + "'이고 가격은 " + formatWon(item.getCurrentPrice()) + "입니다. 두 개 이상 저장하면 더 정확히 비교해드릴 수 있습니다.";
        }

        RecommendedItemDto cheapest = items.get(0);
        RecommendedItemDto expensive = items.get(items.size() - 1);
        StringBuilder answer = new StringBuilder();
        answer.append(contextLabel).append("을 가격 기준으로 비교했습니다.\n\n")
                .append("가장 저렴한 상품은 '").append(cheapest.getTitle()).append("'이고 현재가는 ").append(formatWon(cheapest.getCurrentPrice())).append("입니다.");

        if (cheapest.getLowestPrice() != null && cheapest.getCurrentPrice() != null) {
            long gap = cheapest.getCurrentPrice() - cheapest.getLowestPrice();
            if (gap <= 0) answer.append(" 기록된 최저가 수준이라 가격 메리트가 있습니다.");
            else answer.append(" 최저가보다 ").append(formatWon(gap)).append(" 높은 상태입니다.");
        }

        if (expensive.getCurrentPrice() != null && cheapest.getCurrentPrice() != null) {
            answer.append("\n가장 비싼 후보와는 ").append(formatWon(expensive.getCurrentPrice() - cheapest.getCurrentPrice())).append(" 차이가 납니다.");
        }
        answer.append("\n\n상태, 구성품, 거래 위치까지 함께 확인하면 더 안전하게 고를 수 있습니다.");
        return answer.toString();
    }

    private RecommendedItemDto toRecommendedItemDto(Item item) {
        return RecommendedItemDto.builder()
                .itemId(item.getItemId())
                .title(item.getTitle())
                .currentPrice(item.getCurrentPrice())
                .lowestPrice(item.getLowestPrice())
                .categoryName(item.getCategoryName())
                .thumbnailUrl(item.getThumbnailUrl())
                .itemUrl(item.getItemUrl())
                .score(null)
                .recommendReason(makeReason(item))
                .build();
    }

    private String makeReason(Item item) {
        if (item.getLowestPrice() != null && item.getCurrentPrice() != null && item.getCurrentPrice() <= item.getLowestPrice()) {
            return "기록된 최저가 수준의 상품입니다.";
        }
        return "사용자 상품 목록에서 비교 대상으로 선택된 상품입니다.";
    }

    private String resolveSourceName(String message) {
        return normalize(message).contains("최근") ? "RECENT" : "WISHLIST";
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) return true;
        }
        return false;
    }

    private String normalize(String message) {
        return message == null ? "" : message.replaceAll("\\s+", "").toLowerCase();
    }

    private String formatWon(Long price) {
        return price == null ? "가격 정보 없음" : String.format("%,d원", price);
    }
}
