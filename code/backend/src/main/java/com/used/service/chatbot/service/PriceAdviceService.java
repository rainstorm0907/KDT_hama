package com.used.service.chatbot.service;

import com.used.service.chatbot.repository.ItemRepository;
import com.used.service.chatbot.repository.projection.PriceStatsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PriceAdviceService {

    private final ItemRepository itemRepository;

    @Transactional(readOnly = true)
    public String makePriceAdvice(Long itemId) {
        if (itemId == null) {
            return "?꾩옱 蹂닿퀬 ?덈뒗 ?곹뭹 ?뺣낫瑜?李얠? 紐삵뻽?듬땲?? ?곹뭹 ?곸꽭?섏씠吏?먯꽌 ?ㅼ떆 吏덈Ц??二쇱꽭??";
        }

        PriceStatsProjection stats = itemRepository.findPriceStatsByItemId(itemId);

        if (stats == null || stats.getCurrentPrice() == null) {
            return "???곹뭹??媛寃??뺣낫瑜?李얠? 紐삵뻽?듬땲??";
        }

        long currentPrice = stats.getCurrentPrice();
        Double averageListingPrice = stats.getAverageListingPrice();
        Double averageSoldPrice = stats.getAverageSoldPrice();

        long listingCount = stats.getListingCount() == null ? 0 : stats.getListingCount();
        long soldCount = stats.getSoldCount() == null ? 0 : stats.getSoldCount();

        if (averageListingPrice == null || listingCount < 3) {
            return "鍮꾩듂???곹뭹 ?곗씠?곌? ?꾩쭅 遺議깊빐???됯퇏 媛寃⑷낵 鍮꾧탳?섍린 ?대졄?듬땲?? ?꾩옱 媛寃⑹? "
                    + won(currentPrice)
                    + "?낅땲??";
        }

        long avgListing = Math.round(averageListingPrice);
        long diffFromListing = avgListing - currentPrice;

        StringBuilder answer = new StringBuilder();

        answer.append("???곹뭹???꾩옱媛??")
                .append(won(currentPrice))
                .append("?낅땲??\n");

        answer.append("鍮꾩듂???곹뭹 ")
                .append(listingCount)
                .append("媛쒖쓽 ?됯퇏 留ㅻЪ媛??")
                .append(won(avgListing))
                .append("?낅땲??\n");

        if (averageSoldPrice != null && soldCount > 0) {
            long avgSold = Math.round(averageSoldPrice);
            long diffFromSold = avgSold - currentPrice;

            answer.append("嫄곕옒?꾨즺 ?곹뭹 ")
                    .append(soldCount)
                    .append("媛쒖쓽 ?됯퇏 嫄곕옒媛??")
                    .append(won(avgSold))
                    .append("?낅땲??\n");

            if (diffFromSold > 0) {
                answer.append("?됯퇏 嫄곕옒媛蹂대떎 ??")
                        .append(won(diffFromSold))
                        .append(" ??댄빐?? 吏湲?媛寃⑹? 苑?愿쒖갖? ?몄엯?덈떎.");
            } else if (diffFromSold < 0) {
                answer.append("?됯퇏 嫄곕옒媛蹂대떎 ??")
                        .append(won(Math.abs(diffFromSold)))
                        .append(" 鍮꾩떥?? 議곌툑 ??媛寃⑹쓣 鍮꾧탳?대낫??寃?醫뗭뒿?덈떎.");
            } else {
                answer.append("?됯퇏 嫄곕옒媛? 嫄곗쓽 鍮꾩듂???섏??낅땲??");
            }

            return answer.toString();
        }

        if (diffFromListing > 0) {
            answer.append("?됯퇏 留ㅻЪ媛蹂대떎 ??")
                    .append(won(diffFromListing))
                    .append(" ??댄빀?덈떎. 嫄곕옒?꾨즺 ?곗씠?곕뒗 遺議깊븯吏留? ?꾩옱 留ㅻЪ 湲곗??쇰줈??醫뗭? 媛寃⑹엯?덈떎.");
        } else if (diffFromListing < 0) {
            answer.append("?됯퇏 留ㅻЪ媛蹂대떎 ??")
                    .append(won(Math.abs(diffFromListing)))
                    .append(" 鍮꾩뙃?덈떎. 諛붾줈 援щℓ?섍린蹂대떎??鍮꾩듂???곹뭹????鍮꾧탳?대낫??寃?醫뗭뒿?덈떎.");
        } else {
            answer.append("?됯퇏 留ㅻЪ媛? 嫄곗쓽 鍮꾩듂???섏??낅땲??");
        }

        return answer.toString();
    }

    private String won(long price) {
        return NumberFormat.getNumberInstance(Locale.KOREA).format(price) + "??;
    }
}
