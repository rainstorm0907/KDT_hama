package com.example.ffff.service;

import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.chatbot.repository.ItemRepository;
import com.example.ffff.dto.PricePointResponseDto;
import com.example.ffff.dto.ProductResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ItemRepository itemRepository;

    /*
     * 팀원 최종 DB 기준:
     * 기존 TRADE_STATUS = 'SALE' 대신 SALE_STATUS = 'ON_SALE' 사용
     */
    private static final String ON_SALE = "ON_SALE";

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
                .findTop20BySaleStatusOrderByItemIdDesc(ON_SALE)
                .stream()
                .map(this::toProductResponseDto)
                .toList();
    }

    public List<ProductResponseDto> getProductsByCategory(String category) {
        String categoryName = convertCategory(category);

        return itemRepository
                .findByCategoryNameAndSaleStatusOrderByItemIdDesc(
                        categoryName,
                        ON_SALE
                )
                .stream()
                .map(this::toProductResponseDto)
                .toList();
    }

    public List<ProductResponseDto> searchProducts(String keyword) {
        return itemRepository
                .findByTitleContainingAndSaleStatusOrderByItemIdDesc(
                        keyword,
                        ON_SALE
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

    public ProductResponseDto getProductDetail(String platform, String pid) {
        Item item = itemRepository.findByPlatform_PlatformNameAndOriginalId(platform, pid)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Product not found. platform=" + platform + ", pid=" + pid
                ));

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
                .status(convertSaleStatus(item.getSaleStatus()))
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
        /*
         * 최종 DB에는 PLATFORM_ID가 없고 PLATFORM_NAME이 있음.
         * platform_name이 있으면 우선 사용하고, 없으면 URL로 추론.
         */
        String platformName = normalizeText(item.getPlatformName());

        if (!platformName.isBlank()) {
            return platformName;
        }

        String itemUrl = nullToEmpty(item.getItemUrl()).toLowerCase();

        if (itemUrl.contains("joongna")) {
            return "중고나라";
        }

        if (itemUrl.contains("bunjang")) {
            return "번개장터";
        }

        if (itemUrl.contains("daangn")) {
            return "당근마켓";
        }

        return "중고거래";
    }

    private String resolveCategory(Item item) {
        String categoryName = normalizeText(item.getCategoryName());

        if (!categoryName.isBlank()) {
            return categoryName;
        }

        /*
         * 최종 DB에는 PRODUCT_TYPE 컬럼이 없으므로 제목/표준명 기준으로 추론.
         */
        String inferred = inferCategoryFromText(
                nullToEmpty(item.getTitle()) + " " + nullToEmpty(item.getCanonicalName())
        );

        if (!inferred.isBlank()) {
            return inferred;
        }

        return "기타";
    }

    private String inferCategoryFromText(String text) {
        String lowerText = nullToEmpty(text).toLowerCase();

        if (lowerText.contains("노트북") || lowerText.contains("랩탑")
                || lowerText.contains("그램") || lowerText.contains("갤럭시북")
                || lowerText.contains("thinkpad") || lowerText.contains("씽크패드")
                || lowerText.contains("맥북")) {
            return "노트북";
        }

        if (lowerText.contains("컴퓨터") || lowerText.contains("데스크탑")
                || lowerText.contains("본체") || lowerText.contains("게이밍 pc")
                || lowerText.contains("게이밍pc") || lowerText.contains("pc본체")) {
            return "컴퓨터";
        }

        if (lowerText.contains("아이폰") || lowerText.contains("갤럭시")
                || lowerText.contains("스마트폰") || lowerText.contains("휴대폰")
                || lowerText.contains("핸드폰")) {
            return "핸드폰";
        }

        if (lowerText.contains("자전거")) {
            return "자전거";
        }

        if (lowerText.contains("카메라") || lowerText.contains("디카")) {
            return "카메라";
        }

        if (lowerText.contains("닌텐도") || lowerText.contains("스위치")
                || lowerText.contains("플스") || lowerText.contains("플레이스테이션")
                || lowerText.contains("ps5") || lowerText.contains("ps4")
                || lowerText.contains("xbox") || lowerText.contains("엑스박스")
                || lowerText.contains("스팀덱")) {
            return "게임기";
        }

        if (lowerText.contains("아이패드") || lowerText.contains("갤럭시탭")
                || lowerText.contains("태블릿")) {
            return "태블릿";
        }

        if (lowerText.contains("에어팟") || lowerText.contains("버즈")
                || lowerText.contains("이어폰") || lowerText.contains("헤드셋")
                || lowerText.contains("헤드폰")) {
            return "이어폰";
        }

        if (lowerText.contains("애플워치") || lowerText.contains("갤럭시워치")
                || lowerText.contains("스마트워치")) {
            return "스마트워치";
        }

        if (lowerText.contains("의류") || lowerText.contains("원피스")
                || lowerText.contains("자켓") || lowerText.contains("셔츠")
                || lowerText.contains("바지")) {
            return "의류";
        }

        if (lowerText.contains("신발") || lowerText.contains("운동화")
                || lowerText.contains("스니커즈")) {
            return "신발";
        }

        if (lowerText.contains("가구") || lowerText.contains("테이블")
                || lowerText.contains("의자") || lowerText.contains("책상")) {
            return "가구";
        }

        if (lowerText.contains("기타") || lowerText.contains("피아노")
                || lowerText.contains("악기")) {
            return "악기";
        }

        if (lowerText.contains("캠핑") || lowerText.contains("텐트")) {
            return "캠핑";
        }

        return "";
    }

    private String resolveBrand(Item item, String category) {
        /*
         * 최종 DB에는 BRAND 컬럼이 없으므로 title/canonical_name/matched_keywords 기준으로 추론.
         */
        String sourceText = nullToEmpty(item.getTitle())
                + " "
                + nullToEmpty(item.getCanonicalName())
                + " "
                + nullToEmpty(item.getMatchedKeywords());

        String titleBrand = inferBrandFromText(sourceText);

        if (!titleBrand.isBlank()) {
            return titleBrand;
        }

        if (category != null && !category.isBlank() && !category.equals("기타")) {
            return category;
        }

        return "중고상품";
    }

    private String inferBrandFromText(String text) {
        String lowerText = nullToEmpty(text).toLowerCase();

        if (lowerText.contains("삼성") || lowerText.contains("갤럭시")) {
            return "삼성";
        }

        if (lowerText.contains("엘지") || lowerText.contains("lg") || lowerText.contains("그램")) {
            return "LG";
        }

        if (lowerText.contains("애플") || lowerText.contains("아이폰")
                || lowerText.contains("맥북") || lowerText.contains("아이패드")
                || lowerText.contains("애플워치") || lowerText.contains("에어팟")) {
            return "Apple";
        }

        if (lowerText.contains("레노버") || lowerText.contains("lenovo")
                || lowerText.contains("thinkpad") || lowerText.contains("씽크패드")) {
            return "Lenovo";
        }

        if (lowerText.contains("asus") || lowerText.contains("에이수스")) {
            return "ASUS";
        }

        if (lowerText.contains("msi")) {
            return "MSI";
        }

        if (lowerText.contains("닌텐도") || lowerText.contains("nintendo")) {
            return "Nintendo";
        }

        if (lowerText.contains("소니") || lowerText.contains("플스")
                || lowerText.contains("플레이스테이션") || lowerText.contains("ps5")
                || lowerText.contains("ps4")) {
            return "Sony";
        }

        if (lowerText.contains("마이크로소프트") || lowerText.contains("xbox")
                || lowerText.contains("엑스박스")) {
            return "Microsoft";
        }

        return "";
    }

    private String convertSaleStatus(String saleStatus) {
        if (saleStatus == null || saleStatus.isBlank()) {
            return "판매중";
        }

        return switch (saleStatus) {
            case "ON_SALE", "SALE", "판매중", "판매 중" -> "판매중";
            case "RESERVED", "예약중", "예약 중" -> "예약중";
            case "SOLD_OUT", "SOLD", "판매완료", "판매 완료", "거래완료" -> "판매완료";
            default -> "판매중";
        };
    }

    private String createDescription(Item item, String platform) {
        String title = nullToEmpty(item.getTitle());

        if (title.isBlank()) {
            return "";
        }

        String description = normalizeText(item.getDescription());

        if (!description.isBlank()) {
            return description;
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
