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
            return "상품 상세 정보가 없어 가격 판단을 할 수 없습니다. 상품 상세 화면에서 살래말래 AI를 다시 실행해 주세요.";
        }

        PriceStatsProjection stats = itemRepository.findPriceStatsByItemId(itemId);
        if (stats == null || stats.getCurrentPrice() == null) {
            return "이 상품의 가격 정보를 찾지 못했습니다. 상품 데이터가 충분히 수집된 뒤 다시 확인해 주세요.";
        }

        long currentPrice = stats.getCurrentPrice();
        Double averageListingPrice = stats.getAverageListingPrice();
        Double averageSoldPrice = stats.getAverageSoldPrice();
        long listingCount = stats.getListingCount() == null ? 0 : stats.getListingCount();
        long soldCount = stats.getSoldCount() == null ? 0 : stats.getSoldCount();

        if (averageListingPrice == null || listingCount < 3) {
            return "이 상품의 현재가는 " + won(currentPrice) + "입니다. 비슷한 판매중 상품 데이터가 아직 부족해서 평균가 비교는 제한적입니다.";
        }

        long avgListing = Math.round(averageListingPrice);
        long diffFromListing = avgListing - currentPrice;

        StringBuilder answer = new StringBuilder();
        answer.append("이 상품의 현재가는 ").append(won(currentPrice)).append("입니다.\n");
        answer.append("비슷한 상품 ").append(listingCount).append("개의 평균 매물가는 ").append(won(avgListing)).append("입니다.\n");

        if (averageSoldPrice != null && soldCount > 0) {
            long avgSold = Math.round(averageSoldPrice);
            long diffFromSold = avgSold - currentPrice;
            answer.append("거래완료 상품 ").append(soldCount).append("개의 평균 거래가는 ").append(won(avgSold)).append("입니다.\n");

            if (diffFromSold > 0) {
                answer.append("평균 거래가보다 약 ").append(won(diffFromSold)).append(" 저렴해서, 지금 가격은 꽤 괜찮은 편입니다.");
            } else if (diffFromSold < 0) {
                answer.append("평균 거래가보다 약 ").append(won(Math.abs(diffFromSold))).append(" 비싸서, 조금 더 가격을 비교해보는 게 좋습니다.");
            } else {
                answer.append("평균 거래가와 거의 비슷한 수준입니다.");
            }
            return answer.toString();
        }

        if (diffFromListing > 0) {
            answer.append("평균 매물가보다 약 ").append(won(diffFromListing)).append(" 저렴해서 가격 경쟁력이 있습니다.");
        } else if (diffFromListing < 0) {
            answer.append("평균 매물가보다 약 ").append(won(Math.abs(diffFromListing))).append(" 비싸서 다른 매물도 함께 비교해 보세요.");
        } else {
            answer.append("평균 매물가와 거의 비슷한 수준입니다.");
        }

        return answer.toString();
    }

    private String won(long price) {
        return NumberFormat.getNumberInstance(Locale.KOREA).format(price) + "원";
    }
}
