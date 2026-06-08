package com.example.ffff.chatbot.service;

import com.example.ffff.chatbot.repository.ItemRepository;
import com.example.ffff.chatbot.repository.projection.PriceStatsProjection;
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
            return "현재 보고 있는 상품 정보를 찾지 못했습니다. 상품 상세페이지에서 다시 질문해 주세요.";
        }

        PriceStatsProjection stats = itemRepository.findPriceStatsByItemId(itemId);

        if (stats == null || stats.getCurrentPrice() == null) {
            return "이 상품의 가격 정보를 찾지 못했습니다.";
        }

        long currentPrice = stats.getCurrentPrice();
        Double averageListingPrice = stats.getAverageListingPrice();
        Double averageSoldPrice = stats.getAverageSoldPrice();

        long listingCount = stats.getListingCount() == null ? 0 : stats.getListingCount();
        long soldCount = stats.getSoldCount() == null ? 0 : stats.getSoldCount();

        if (averageListingPrice == null || listingCount < 3) {
            return "비슷한 상품 데이터가 아직 부족해서 평균 가격과 비교하기 어렵습니다. 현재 가격은 "
                    + won(currentPrice)
                    + "입니다.";
        }

        long avgListing = Math.round(averageListingPrice);
        long diffFromListing = avgListing - currentPrice;

        StringBuilder answer = new StringBuilder();

        answer.append("이 상품의 현재가는 ")
                .append(won(currentPrice))
                .append("입니다.\n");

        answer.append("비슷한 상품 ")
                .append(listingCount)
                .append("개의 평균 매물가는 ")
                .append(won(avgListing))
                .append("입니다.\n");

        if (averageSoldPrice != null && soldCount > 0) {
            long avgSold = Math.round(averageSoldPrice);
            long diffFromSold = avgSold - currentPrice;

            answer.append("거래완료 상품 ")
                    .append(soldCount)
                    .append("개의 평균 거래가는 ")
                    .append(won(avgSold))
                    .append("입니다.\n");

            if (diffFromSold > 0) {
                answer.append("평균 거래가보다 약 ")
                        .append(won(diffFromSold))
                        .append(" 저렴해서, 지금 가격은 꽤 괜찮은 편입니다.");
            } else if (diffFromSold < 0) {
                answer.append("평균 거래가보다 약 ")
                        .append(won(Math.abs(diffFromSold)))
                        .append(" 비싸서, 조금 더 가격을 비교해보는 게 좋습니다.");
            } else {
                answer.append("평균 거래가와 거의 비슷한 수준입니다.");
            }

            return answer.toString();
        }

        if (diffFromListing > 0) {
            answer.append("평균 매물가보다 약 ")
                    .append(won(diffFromListing))
                    .append(" 저렴합니다. 거래완료 데이터는 부족하지만, 현재 매물 기준으로는 좋은 가격입니다.");
        } else if (diffFromListing < 0) {
            answer.append("평균 매물가보다 약 ")
                    .append(won(Math.abs(diffFromListing)))
                    .append(" 비쌉니다. 바로 구매하기보다는 비슷한 상품을 더 비교해보는 게 좋습니다.");
        } else {
            answer.append("평균 매물가와 거의 비슷한 수준입니다.");
        }

        return answer.toString();
    }

    private String won(long price) {
        return NumberFormat.getNumberInstance(Locale.KOREA).format(price) + "원";
    }
}