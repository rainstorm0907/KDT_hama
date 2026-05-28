package com.example.ffff.service;

import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.chatbot.repository.ItemRepository;
import com.example.ffff.dto.PricePointResponseDto;
import com.example.ffff.dto.ProductResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ItemRepository itemRepository;

    private static final String NOT_DELETED = "N";
    private static final String SALE_STATUS = "SALE";
    private static final String NOT_ACCESSORY = "N";

    private static final Map<String, String> CATEGORY_ID_TO_NAME = Map.ofEntries(
            Map.entry("pc", "컴퓨터"),
            Map.entry("laptop", "노트북"),
            Map.entry("phone", "핸드폰"),
            Map.entry("bike", "자전거"),
            Map.entry("cloth", "의류"),
            Map.entry("shoes", "신발"),
            Map.entry("goods", "굿즈"),
            Map.entry("camera", "카메라"),
            Map.entry("game", "게임기"),
            Map.entry("furniture", "가구"),
            Map.entry("music", "악기"),
            Map.entry("camping", "캠핑")
    );

    public List<ProductResponseDto> getRecommendedProducts() {
        return itemRepository
                .findTop20ByIsDeletedAndTradeStatusAndIsAccessoryOrderByItemIdDesc(
                        NOT_DELETED,
                        SALE_STATUS,
                        NOT_ACCESSORY
                )
                .stream()
                .map(this::toProductResponseDto)
                .toList();
    }

    public List<ProductResponseDto> getProductsByCategory(String category) {
        String categoryName = convertCategory(category);

        return itemRepository
                .findByCategoryNameAndIsDeletedAndTradeStatusAndIsAccessoryOrderByItemIdDesc(
                        categoryName,
                        NOT_DELETED,
                        SALE_STATUS,
                        NOT_ACCESSORY
                )
                .stream()
                .map(this::toProductResponseDto)
                .toList();
    }

    public List<ProductResponseDto> searchProducts(String keyword) {
        return itemRepository
                .findByTitleContainingAndIsDeletedAndTradeStatusAndIsAccessoryOrderByItemIdDesc(
                        keyword,
                        NOT_DELETED,
                        SALE_STATUS,
                        NOT_ACCESSORY
                )
                .stream()
                .map(this::toProductResponseDto)
                .toList();
    }

    public ProductResponseDto getProductDetail(Long id) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다. id=" + id));

        return toProductResponseDto(item);
    }

    private ProductResponseDto toProductResponseDto(Item item) {
        String imageUrl = item.getThumbnailUrl();
        Long price = item.getCurrentPrice() == null ? 0L : item.getCurrentPrice();

        String platform = resolvePlatform(item);
        String category = resolveCategory(item);
        String brand = resolveBrand(item, category);

        return ProductResponseDto.builder()
                .id(item.getItemId())
                .platform(platform)
                .pid(nullToEmpty(item.getOriginalId()))
                .name(nullToEmpty(item.getTitle()))
                .brand(brand)
                .price(price)
                .status(convertTradeStatus(item.getTradeStatus()))
                .description(createDescription(item, platform))
                .imageUrl(imageUrl)
                .images(createImages(imageUrl))
                .link(nullToEmpty(item.getItemUrl()))
                .date(formatDate(item))
                .category(category)
                .priceHistory(createPriceHistory(item))
                .build();
    }

    private String resolvePlatform(Item item) {
        String itemUrl = nullToEmpty(item.getItemUrl()).toLowerCase();
        Long platformId = item.getPlatformId();

        if (itemUrl.contains("joongna")) {
            return "중고나라";
        }

        if (itemUrl.contains("bunjang")) {
            return "번개장터";
        }

        if (itemUrl.contains("daangn")) {
            return "당근마켓";
        }

        if (platformId == null) {
            return "중고거래";
        }

        if (platformId.equals(1L)) {
            return "중고나라";
        }

        if (platformId.equals(2L)) {
            return "번개장터";
        }

        if (platformId.equals(3L)) {
            return "당근마켓";
        }

        return "중고거래";
    }

    private String resolveCategory(Item item) {
        String categoryName = normalizeText(item.getCategoryName());

        if (!categoryName.isBlank()) {
            return categoryName;
        }

        String productType = normalizeText(item.getProductType());

        if (productType.equalsIgnoreCase("desktop")) {
            return "컴퓨터";
        }

        if (productType.equalsIgnoreCase("laptop")) {
            return "노트북";
        }

        if (productType.equalsIgnoreCase("smartphone")) {
            return "핸드폰";
        }

        if (productType.equalsIgnoreCase("game_console")) {
            return "게임기";
        }

        return inferCategoryFromTitle(item.getTitle());
    }

    private String inferCategoryFromTitle(String title) {
        String lowerTitle = nullToEmpty(title).toLowerCase();

        if (lowerTitle.contains("노트북") || lowerTitle.contains("랩탑")
                || lowerTitle.contains("그램") || lowerTitle.contains("갤럭시북")
                || lowerTitle.contains("thinkpad") || lowerTitle.contains("씽크패드")) {
            return "노트북";
        }

        if (lowerTitle.contains("컴퓨터") || lowerTitle.contains("데스크탑")
                || lowerTitle.contains("본체") || lowerTitle.contains("pc")) {
            return "컴퓨터";
        }

        if (lowerTitle.contains("아이폰") || lowerTitle.contains("갤럭시")
                || lowerTitle.contains("스마트폰") || lowerTitle.contains("휴대폰")
                || lowerTitle.contains("핸드폰")) {
            return "핸드폰";
        }

        if (lowerTitle.contains("자전거")) {
            return "자전거";
        }

        if (lowerTitle.contains("카메라") || lowerTitle.contains("디카")) {
            return "카메라";
        }

        if (lowerTitle.contains("닌텐도") || lowerTitle.contains("스위치")
                || lowerTitle.contains("플스") || lowerTitle.contains("ps5")
                || lowerTitle.contains("ps4") || lowerTitle.contains("xbox")
                || lowerTitle.contains("스팀덱")) {
            return "게임기";
        }

        if (lowerTitle.contains("의류") || lowerTitle.contains("원피스")
                || lowerTitle.contains("자켓") || lowerTitle.contains("셔츠")
                || lowerTitle.contains("바지")) {
            return "의류";
        }

        if (lowerTitle.contains("신발") || lowerTitle.contains("운동화")
                || lowerTitle.contains("스니커즈")) {
            return "신발";
        }

        if (lowerTitle.contains("가구") || lowerTitle.contains("테이블")
                || lowerTitle.contains("의자") || lowerTitle.contains("책상")) {
            return "가구";
        }

        if (lowerTitle.contains("기타") || lowerTitle.contains("피아노")
                || lowerTitle.contains("악기")) {
            return "악기";
        }

        if (lowerTitle.contains("캠핑") || lowerTitle.contains("텐트")) {
            return "캠핑";
        }

        return "기타";
    }

    private String resolveBrand(Item item, String category) {
        String brand = normalizeText(item.getBrand());

        if (!brand.isBlank()) {
            return brand;
        }

        String titleBrand = inferBrandFromTitle(item.getTitle());

        if (!titleBrand.isBlank()) {
            return titleBrand;
        }

        if (category != null && !category.isBlank() && !category.equals("기타")) {
            return category;
        }

        return "중고상품";
    }

    private String inferBrandFromTitle(String title) {
        String lowerTitle = nullToEmpty(title).toLowerCase();

        if (lowerTitle.contains("삼성") || lowerTitle.contains("갤럭시")) {
            return "삼성";
        }

        if (lowerTitle.contains("엘지") || lowerTitle.contains("lg") || lowerTitle.contains("그램")) {
            return "LG";
        }

        if (lowerTitle.contains("애플") || lowerTitle.contains("아이폰")
                || lowerTitle.contains("맥북") || lowerTitle.contains("아이패드")) {
            return "Apple";
        }

        if (lowerTitle.contains("레노버") || lowerTitle.contains("lenovo")
                || lowerTitle.contains("thinkpad") || lowerTitle.contains("씽크패드")) {
            return "Lenovo";
        }

        if (lowerTitle.contains("asus") || lowerTitle.contains("에이수스")) {
            return "ASUS";
        }

        if (lowerTitle.contains("msi")) {
            return "MSI";
        }

        if (lowerTitle.contains("닌텐도") || lowerTitle.contains("nintendo")) {
            return "Nintendo";
        }

        if (lowerTitle.contains("소니") || lowerTitle.contains("플스")
                || lowerTitle.contains("플레이스테이션") || lowerTitle.contains("ps5")
                || lowerTitle.contains("ps4")) {
            return "Sony";
        }

        return "";
    }

    private String convertTradeStatus(String tradeStatus) {
        if (tradeStatus == null || tradeStatus.isBlank()) {
            return "판매중";
        }

        return switch (tradeStatus) {
            case "SALE", "판매중" -> "판매중";
            case "RESERVED", "예약중" -> "예약중";
            case "SOLD", "판매완료" -> "판매완료";
            default -> "판매중";
        };
    }

    private String createDescription(Item item, String platform) {
        String title = nullToEmpty(item.getTitle());

        if (title.isBlank()) {
            return "";
        }

        if (platform == null || platform.isBlank()) {
            return title + " 상품입니다. 상세 상태와 거래 조건은 원본 페이지에서 확인해 주세요.";
        }

        return title + " 상품입니다. "
                + platform
                + "에서 수집한 실제 중고거래 매물이며, 상세 상태와 거래 조건은 원본 페이지에서 확인해 주세요.";
    }

    private List<String> createImages(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return List.of();
        }

        return List.of(imageUrl, imageUrl, imageUrl);
    }

    private String formatDate(Item item) {
        if (item.getCrawledAt() == null) {
            return "";
        }

        return item.getCrawledAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
    }

    private List<PricePointResponseDto> createPriceHistory(Item item) {
        Long currentPrice = item.getCurrentPrice();
        Long lowestPrice = item.getLowestPrice();

        if (currentPrice == null || currentPrice <= 0) {
            return List.of();
        }

        if (lowestPrice == null || lowestPrice <= 0) {
            return createEstimatedPriceHistory(currentPrice);
        }

        return List.of(
                PricePointResponseDto.builder()
                        .label("최저가")
                        .price(lowestPrice)
                        .build(),
                PricePointResponseDto.builder()
                        .label("현재가")
                        .price(currentPrice)
                        .build()
        );
    }

    private List<PricePointResponseDto> createEstimatedPriceHistory(Long price) {
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM.dd");

        double[] multipliers = {
                1.08,
                1.05,
                1.03,
                1.01,
                0.99,
                1.02,
                1.00
        };

        return List.of(
                createPricePoint(today.minusDays(6), formatter, price, multipliers[0]),
                createPricePoint(today.minusDays(5), formatter, price, multipliers[1]),
                createPricePoint(today.minusDays(4), formatter, price, multipliers[2]),
                createPricePoint(today.minusDays(3), formatter, price, multipliers[3]),
                createPricePoint(today.minusDays(2), formatter, price, multipliers[4]),
                createPricePoint(today.minusDays(1), formatter, price, multipliers[5]),
                createPricePoint(today, formatter, price, multipliers[6])
        );
    }

    private PricePointResponseDto createPricePoint(
            LocalDate date,
            DateTimeFormatter formatter,
            Long price,
            double multiplier
    ) {
        long calculatedPrice = Math.max(
                1000L,
                Math.round((price * multiplier) / 1000.0) * 1000L
        );

        return PricePointResponseDto.builder()
                .label(date.format(formatter))
                .price(calculatedPrice)
                .build();
    }

    private String convertCategory(String category) {
        if (category == null || category.isBlank()) {
            return "";
        }

        return CATEGORY_ID_TO_NAME.getOrDefault(category, category);
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        if (value.equalsIgnoreCase("UNKNOWN")) {
            return "";
        }

        if (value.equalsIgnoreCase("NULL")) {
            return "";
        }

        return value.trim();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}