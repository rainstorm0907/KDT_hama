package com.used.service.chatbot.service;

import com.used.service.chatbot.entity.SearchLog;
import com.used.service.chatbot.repository.SearchLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SearchLogService {

    private final SearchLogRepository searchLogRepository;

    @Transactional
    public void saveSearchKeyword(Long userId, String keyword) {
        if (userId == null || keyword == null || keyword.isBlank()) {
            return;
        }

        SearchLog log = new SearchLog();
        log.setUserId(userId);
        log.setKeyword(keyword.trim());
        log.setClickedItemId(null);

        searchLogRepository.save(log);
    }

    @Transactional
    public void saveClickedItem(Long userId, Long itemId, String keyword) {
        if (userId == null || itemId == null) {
            return;
        }

        SearchLog log = new SearchLog();
        log.setUserId(userId);
        log.setKeyword(keyword == null || keyword.isBlank() ? "?곹뭹 ?대┃" : keyword.trim());
        log.setClickedItemId(itemId);

        searchLogRepository.save(log);
    }
}
