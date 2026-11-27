package com.innfinder.backend.service;

import com.innfinder.backend.entity.*;
import com.innfinder.backend.repository.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiTrackingServiceTest {
    @Test void resolvesUsernameAndContainsQueueFailure() {
        var logs = mock(AiUsageLogRepository.class);
        var users = mock(NguoiDungRepository.class);
        var service = new AiTrackingService(logs, mock(PhongTroRepository.class), mock(PhongTroVectorRepository.class));
        var user = new NguoiDung();
        user.setMaNguoiDung("ND251120260001");
        when(users.findByTenDangNhap(anyString())).thenReturn(Optional.of(user));
        ReflectionTestUtils.setField(service, "users", users);
        ReflectionTestUtils.setField(service, "executor", (Executor) Runnable::run);
        var entry = AiUsageLog.builder().maNguoiDung("a_username_longer_than_fourteen_characters").feature("CHAT").build();
        service.recordAsync(entry);
        assertEquals(user.getMaNguoiDung(), entry.getMaNguoiDung());
        verify(logs).save(entry);
        ReflectionTestUtils.setField(service, "executor", (Executor) task -> { throw new RejectedExecutionException(); });
        assertDoesNotThrow(() -> service.recordAsync(AiUsageLog.builder().feature("CHAT").build()));
    }
    @Test void quotaHandlesEmptyUsageAndStopsBeforeAsyncPersistence() {
        var logs = mock(AiUsageLogRepository.class);
        var service = new AiTrackingService(logs, mock(PhongTroRepository.class), mock(PhongTroVectorRepository.class));
        ReflectionTestUtils.setField(service, "dailyTokenBudget", 100L);
        when(logs.sumTokensSince(any())).thenReturn(null);
        assertFalse(service.isDailyQuotaExceeded());
        service.observeProviderTokens(99);
        assertFalse(service.isDailyQuotaExceeded());
        service.observeProviderTokens(1);
        assertTrue(service.isDailyQuotaExceeded());
    }
    @Test void pendingEventsSeeFinalIntentAndContextIsClearedEvenWhenOneFails() {
        var state = AiTrackingContext.start("CHAT", null);
        var captured = new ArrayList<String>();
        state.pending.add(() -> { throw new IllegalStateException(); });
        state.pending.add(() -> captured.add(state.intent));
        AiTrackingContext.setIntent("SEARCH");
        AiTrackingContext.clear();
        assertEquals(List.of("SEARCH"), captured);
        assertNull(AiTrackingContext.current());
    }

    @Test void summarySeparatesProviderUsageFromRecommendationEventsAndRequiresModelPricing() {
        var logs = mock(AiUsageLogRepository.class);
        var vectors = mock(PhongTroVectorRepository.class);
        var discovery = mock(RoomDiscoveryService.class);
        var service = new AiTrackingService(logs, mock(PhongTroRepository.class), vectors);
        ReflectionTestUtils.setField(service, "discovery", discovery);
        when(discovery.find(any())).thenReturn(List.of());
        var provider = AiUsageLog.builder().traceId("chat").feature("CHAT").model("configured-model").status("SUCCESS")
            .promptTokens(1000000).totalTokens(1000000).createdAt(java.time.LocalDateTime.now()).build();
        var impression = AiUsageLog.builder().traceId("card").feature("RECOMMEND_IMPRESSION").status("SUCCESS").createdAt(java.time.LocalDateTime.now()).build();
        var click = AiUsageLog.builder().traceId("card").feature("RECOMMEND_CLICK").status("SUCCESS").createdAt(java.time.LocalDateTime.now()).build();
        when(logs.findByCreatedAtAfterOrderByCreatedAtAsc(any())).thenReturn(List.of(provider, impression, click));
        var summary = service.getSummary(7);
        assertEquals(1, summary.getProviderCalls());
        assertEquals(100.0, summary.getRecommendationStats().getCtrPercent());
        assertFalse(summary.isPricingConfigured());
        ReflectionTestUtils.setField(service, "pricingPerMillion", "configured-model=0.5,2");
        summary = service.getSummary(7);
        assertTrue(summary.isPricingConfigured());
        assertEquals(0.5, summary.getEstimatedCostUsd());
    }
}
