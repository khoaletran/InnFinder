package com.innfinder.backend.service;

import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.entity.AiUsageLog;
import com.innfinder.backend.exception.AppException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecommendationInteractionServiceTest {
    @Test void clicksRequireVisibleRoomAndAreDeduplicated() {
        var discovery = mock(RoomDiscoveryService.class);
        var tracking = mock(AiTrackingService.class);
        String room = "PT251126120001";
        when(discovery.findByIds(any())).thenReturn(List.of(new RoomDiscoveryService.Document(
                RoomSummaryResponse.builder().maPhongTro(room).build(), null, "room")));
        var service = new RecommendationInteractionService(discovery, tracking);
        String ticket = service.impression(List.of(room), "home_personalized", "127.0.0.1");
        service.click(ticket, room);
        service.click(ticket, room);
        assertThrows(AppException.class, () -> service.click(ticket, "PT251126120002"));
        assertThrows(AppException.class, () -> service.click("invalid", room));
        var events = ArgumentCaptor.forClass(AiUsageLog.class);
        verify(tracking, times(2)).recordAsync(events.capture());
        assertEquals(List.of("RECOMMEND_IMPRESSION", "RECOMMEND_CLICK"), events.getAllValues().stream().map(AiUsageLog::getFeature).toList());
    }

    @Test void rejectsMissingSourceAndLimitsEventFlood() {
        var discovery = mock(RoomDiscoveryService.class);
        when(discovery.findByIds(any())).thenReturn(List.of());
        var service = new RecommendationInteractionService(discovery, mock(AiTrackingService.class));
        assertThrows(AppException.class, () -> service.impression(List.of("PT251126120001"), null, "ip"));
        for (int i = 0; i < 29; i++) service.impression(List.of("PT251126120001"), "detail_similar", "ip");
        assertThrows(AppException.class, () -> service.impression(List.of("PT251126120001"), "detail_similar", "ip"));
    }
}
