package com.used.service.chatbot.service;

import com.used.service.chatbot.dto.ChatAnalysisResult;
import com.used.service.chatbot.dto.ChatMessageRequest;
import com.used.service.chatbot.dto.ChatMessageResponse;
import com.used.service.chatbot.dto.RecommendedItemDto;
import com.used.service.chatbot.repository.ChatHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatbotServiceTest {

    @Mock private FaqService faqService;
    @Mock private GeminiClientService geminiClientService;
    @Mock private RecommendationService recommendationService;
    @Mock private ChatHistoryRepository chatHistoryRepository;
    @Mock private SearchLogService searchLogService;
    @Mock private PriceAdviceService priceAdviceService;
    @Mock private GameSpecGuideService gameSpecGuideService;
    @Mock private PersonalProductContextService personalProductContextService;
    @Mock private ChatbotTemplateService chatbotTemplateService;

    private ChatbotService chatbotService;

    @BeforeEach
    void setUp() {
        chatbotService = new ChatbotService(
                faqService,
                geminiClientService,
                recommendationService,
                chatHistoryRepository,
                searchLogService,
                priceAdviceService,
                gameSpecGuideService,
                personalProductContextService,
                chatbotTemplateService
        );
    }

    @Test
    void productRecommendationBypassesFaqAndLoadsProducts() {
        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("배그 가능한 컴퓨터 추천해줘");

        ChatAnalysisResult analysis = new ChatAnalysisResult();
        analysis.setIntent("PRODUCT_RECOMMEND");
        analysis.setKeyword("컴퓨터");
        analysis.setProductType("desktop");
        analysis.setUseCase("gaming");
        analysis.setGameName("배그");
        analysis.setPerformanceLevel("HIGH");

        RecommendedItemDto item = RecommendedItemDto.builder()
                .itemId(1L)
                .title("RTX 4070 게이밍 컴퓨터")
                .currentPrice(900_000L)
                .lowestPrice(850_000L)
                .score(100)
                .build();

        when(personalProductContextService.supports(request.getMessage())).thenReturn(false);
        when(chatbotTemplateService.findAnswer(request.getMessage())).thenReturn(Optional.empty());
        when(geminiClientService.analyzeMessage(request.getMessage())).thenReturn(analysis);
        when(recommendationService.recommendByAnalysisResult(7L, analysis)).thenReturn(List.of(item));
        when(faqService.findAnswer(request.getMessage())).thenReturn(Optional.empty());
        when(geminiClientService.generateProductAnswer(
                any(),
                any(),
                any(),
                any(),
                any()
        )).thenReturn("OpenSearch 결과를 기준으로 배그용 컴퓨터 후보를 정리했습니다.");

        ChatMessageResponse response = chatbotService.handleMessage(7L, request);

        assertThat(response.getIntent()).isEqualTo("PRODUCT_RECOMMEND");
        assertThat(response.getItems()).containsExactly(item);
        verify(faqService).findAnswer(request.getMessage());
        verify(recommendationService).recommendByAnalysisResult(7L, analysis);
        verify(geminiClientService).generateProductAnswer(
                any(),
                any(),
                any(),
                any(),
                any()
        );
    }
}
