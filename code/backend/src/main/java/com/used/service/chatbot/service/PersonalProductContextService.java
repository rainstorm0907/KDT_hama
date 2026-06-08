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

        boolean asksPersonalContext =
                normalized.contains("李?)
                        || normalized.contains("愿?ъ긽??)
                        || normalized.contains("愿??)
                        || normalized.contains("理쒓렐蹂?)
                        || normalized.contains("理쒓렐?곹뭹")
                        || normalized.contains("理쒓렐");

        boolean asksCompare =
                normalized.contains("鍮꾧탳")
                        || normalized.contains("怨⑤씪")
                        || normalized.contains("異붿쿇")
                        || normalized.contains("萸먭??섏븘")
                        || normalized.contains("萸먭?醫뗭븘")
                        || normalized.contains("?붿떥")
                        || normalized.contains("???)
                        || normalized.contains("理쒖?媛")
                        || normalized.contains("紐⑸줉")
                        || normalized.contains("蹂댁뿬");

        return asksPersonalContext && asksCompare;
    }

    @Transactional(readOnly = true)
    public ChatMessageResponse handle(Long userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("?ъ슜?먮? 李얠쓣 ???놁뒿?덈떎."));

        String sourceName = resolveSourceName(message);
        List<Item> items = "RECENT".equals(sourceName)
                ? loadRecentItems(user)
                : loadWishlistItems(user);

        if (items.isEmpty()) {
            String answer = "RECENT".equals(sourceName)
                    ? "理쒓렐 蹂??곹뭹???꾩쭅 ?놁뒿?덈떎. ?곹뭹 ?곸꽭瑜?紐?媛??뺤씤?????ㅼ떆 鍮꾧탳???щ씪怨??댁＜?몄슂."
                    : "李?紐⑸줉???꾩쭅 鍮꾩뼱 ?덉뒿?덈떎. 鍮꾧탳?섍퀬 ?띠? ?곹뭹??癒쇱? 李쒗븳 ???ㅼ떆 臾쇱뼱遊?二쇱꽭??";

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
        String contextLabel = "RECENT".equals(sourceName) ? "理쒓렐 蹂??곹뭹" : "李?紐⑸줉";

        if (items.size() == 1) {
            RecommendedItemDto item = items.get(0);
            return contextLabel + "??鍮꾧탳???곹뭹??1媛쒕쭔 ?덉뒿?덈떎.\n"
                    + "?꾩옱 ?뺤씤 媛?ν븳 ?곹뭹? '" + item.getTitle() + "'?닿퀬 媛寃⑹? "
                    + formatWon(item.getCurrentPrice()) + "?낅땲?? 2媛??댁긽 ?닿린硫?媛寃⑷낵 ?곹깭瑜?媛숈씠 鍮꾧탳?대뱶由닿쾶??";
        }

        RecommendedItemDto cheapest = items.get(0);
        RecommendedItemDto expensive = items.get(items.size() - 1);

        StringBuilder answer = new StringBuilder();
        answer.append(contextLabel)
                .append("?먯꽌 媛寃?湲곗??쇰줈 鍮꾧탳?대뇬?듬땲??\n\n")
                .append("媛????댄븳 ?곹뭹? '")
                .append(cheapest.getTitle())
                .append("'?닿퀬 ?꾩옱媛??")
                .append(formatWon(cheapest.getCurrentPrice()))
                .append("?낅땲??");

        if (cheapest.getLowestPrice() != null && cheapest.getCurrentPrice() != null) {
            long gap = cheapest.getCurrentPrice() - cheapest.getLowestPrice();
            if (gap <= 0) {
                answer.append(" ?깅줉??理쒖?媛 湲곗??쇰줈??醫뗭? 媛寃⑹엯?덈떎.");
            } else {
                answer.append(" ?깅줉??理쒖?媛蹂대떎 ")
                        .append(formatWon(gap))
                        .append(" ?믪뒿?덈떎.");
            }
        }

        if (expensive.getCurrentPrice() != null && cheapest.getCurrentPrice() != null) {
            long gap = expensive.getCurrentPrice() - cheapest.getCurrentPrice();
            answer.append("\n媛??鍮꾩떬 ?곹뭹怨쇰뒗 ")
                    .append(formatWon(gap))
                    .append(" 李⑥씠媛 ?⑸땲??");
        }

        answer.append("\n\n?꾨옒 ?곹뭹 移대뱶?먯꽌 ?곸꽭 ?뺣낫? ?먮Ц 留곹겕瑜??뺤씤?대낫?몄슂.");
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
            return "?꾩옱媛媛 湲곕줉??理쒖?媛 ?섏??낅땲??";
        }

        return "?ъ슜??湲곕줉?먯꽌 遺덈윭??鍮꾧탳 ????곹뭹?낅땲??";
    }

    private String resolveSourceName(String message) {
        String normalized = normalize(message);
        if (normalized.contains("理쒓렐")) {
            return "RECENT";
        }

        return "WISHLIST";
    }

    private String normalize(String message) {
        return message == null ? "" : message.replaceAll("\\s+", "").toLowerCase();
    }

    private String formatWon(Long price) {
        if (price == null) {
            return "媛寃??뺣낫 ?놁쓬";
        }

        return String.format("%,d??, price);
    }
}

