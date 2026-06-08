package com.example.ffff.chatbot.service;

import com.example.ffff.chatbot.dto.ChatMessageResponse;
import com.example.ffff.chatbot.dto.RecommendedItemDto;
import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.entity.ItemView;
import com.example.ffff.entity.User;
import com.example.ffff.entity.Wishlist;
import com.example.ffff.repository.ItemViewRepository;
import com.example.ffff.repository.UserRepository;
import com.example.ffff.repository.WishlistRepository;
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

        boolean asksPersonalContext =
                normalized.contains("찜")
                        || normalized.contains("관심상품")
                        || normalized.contains("관심")
                        || normalized.contains("최근본")
                        || normalized.contains("최근상품")
                        || normalized.contains("최근");

        boolean asksCompare =
                normalized.contains("비교")
                        || normalized.contains("골라")
                        || normalized.contains("추천")
                        || normalized.contains("뭐가나아")
                        || normalized.contains("뭐가좋아")
                        || normalized.contains("더싸")
                        || normalized.contains("저렴")
                        || normalized.contains("최저가")
                        || normalized.contains("목록")
                        || normalized.contains("보여");

        return asksPersonalContext && asksCompare;
    }

    @Transactional(readOnly = true)
    public ChatMessageResponse handle(Long userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        String sourceName = resolveSourceName(message);
        List<Item> items = "RECENT".equals(sourceName)
                ? loadRecentItems(user)
                : loadWishlistItems(user);

        if (items.isEmpty()) {
            String answer = "RECENT".equals(sourceName)
                    ? "최근 본 상품이 아직 없습니다. 상품 상세를 몇 개 확인한 뒤 다시 비교해 달라고 해주세요."
                    : "찜 목록이 아직 비어 있습니다. 비교하고 싶은 상품을 먼저 찜한 뒤 다시 물어봐 주세요.";

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

        String answer = makeCompareAnswer(sourceName, comparedItems);

        return ChatMessageResponse.builder()
                .answer(answer)
                .intent("PERSONAL_CONTEXT_COMPARE")
                .responseType("USER_CONTEXT")
                .keyword("")
                .items(comparedItems)
                .build();
    }

    private List<Item> loadWishlistItems(User user) {
        return wishlistRepository.findByUserOrderByAddedAtDesc(user)
                .stream()
                .map(Wishlist::getItem)
                .toList();
    }

    private List<Item> loadRecentItems(User user) {
        return itemViewRepository.findTop20ByUserOrderByViewedAtDesc(user)
                .stream()
                .map(ItemView::getItem)
                .toList();
    }

    private String makeCompareAnswer(String sourceName, List<RecommendedItemDto> items) {
        String contextLabel = "RECENT".equals(sourceName) ? "최근 본 상품" : "찜 목록";

        if (items.size() == 1) {
            RecommendedItemDto item = items.get(0);
            return contextLabel + "에 비교할 상품이 1개만 있습니다.\n"
                    + "현재 확인 가능한 상품은 '" + item.getTitle() + "'이고 가격은 "
                    + formatWon(item.getCurrentPrice()) + "입니다. 2개 이상 담기면 가격과 상태를 같이 비교해드릴게요.";
        }

        RecommendedItemDto cheapest = items.get(0);
        RecommendedItemDto expensive = items.get(items.size() - 1);

        StringBuilder answer = new StringBuilder();
        answer.append(contextLabel)
                .append("에서 가격 기준으로 비교해봤습니다.\n\n")
                .append("가장 저렴한 상품은 '")
                .append(cheapest.getTitle())
                .append("'이고 현재가는 ")
                .append(formatWon(cheapest.getCurrentPrice()))
                .append("입니다.");

        if (cheapest.getLowestPrice() != null && cheapest.getCurrentPrice() != null) {
            long gap = cheapest.getCurrentPrice() - cheapest.getLowestPrice();
            if (gap <= 0) {
                answer.append(" 등록된 최저가 기준으로도 좋은 가격입니다.");
            } else {
                answer.append(" 등록된 최저가보다 ")
                        .append(formatWon(gap))
                        .append(" 높습니다.");
            }
        }

        if (expensive.getCurrentPrice() != null && cheapest.getCurrentPrice() != null) {
            long gap = expensive.getCurrentPrice() - cheapest.getCurrentPrice();
            answer.append("\n가장 비싼 상품과는 ")
                    .append(formatWon(gap))
                    .append(" 차이가 납니다.");
        }

        answer.append("\n\n아래 상품 카드에서 상세 정보와 원문 링크를 확인해보세요.");
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
        if (item.getLowestPrice() != null
                && item.getCurrentPrice() != null
                && item.getCurrentPrice() <= item.getLowestPrice()) {
            return "현재가가 기록된 최저가 수준입니다.";
        }

        return "사용자 기록에서 불러온 비교 대상 상품입니다.";
    }

    private String resolveSourceName(String message) {
        String normalized = normalize(message);
        if (normalized.contains("최근")) {
            return "RECENT";
        }

        return "WISHLIST";
    }

    private String normalize(String message) {
        return message == null ? "" : message.replaceAll("\\s+", "").toLowerCase();
    }

    private String formatWon(Long price) {
        if (price == null) {
            return "가격 정보 없음";
        }

        return String.format("%,d원", price);
    }
}
