package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.entity.AiUsageLog;
import com.innfinder.backend.exception.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiTrackingTest {
    @Test void quotaGuardPreventsProviderRequest() {
        var builder = RestClient.builder().baseUrl("https://test.invalid");
        var server = MockRestServiceServer.bindTo(builder).build();
        var transport = builder.build();
        var client = new GeminiClient(new ObjectMapper(), "test-key", "test-model", transport, transport);
        var tracking = mock(AiTrackingService.class);
        ReflectionTestUtils.setField(client, "trackingService", tracking);
        when(tracking.isDailyQuotaExceeded()).thenReturn(true);
        assertEquals(ErrorCode.AI_QUOTA_EXCEEDED, assertThrows(AppException.class,
            () -> client.post("test-model", "generateContent", Map.of())).getErrorCode());
        server.verify();
    }

    @Test void providerEventUsesFinalPipelineIntentAndMode() {
        var builder = RestClient.builder().baseUrl("https://test.invalid");
        var server = MockRestServiceServer.bindTo(builder).build();
        var transport = builder.build();
        var client = new GeminiClient(new ObjectMapper(), "test-key", "test-model", transport, transport);
        var tracking = mock(AiTrackingService.class);
        ReflectionTestUtils.setField(client, "trackingService", tracking);
        server.expect(anything()).andRespond(withSuccess("{\"usageMetadata\":{\"totalTokenCount\":12}}", MediaType.APPLICATION_JSON));
        AiTrackingContext.start("CHAT", "tester");
        try {
            client.post("test-model", "generateContent", Map.of());
            verify(tracking, never()).recordAsync(any());
            verify(tracking).observeProviderTokens(12);
            AiTrackingContext.setIntent("SEARCH");
            AiTrackingContext.setSearchMode("SEMANTIC");
        } finally { AiTrackingContext.clear(); }
        var entry = ArgumentCaptor.forClass(AiUsageLog.class);
        verify(tracking).recordAsync(entry.capture());
        assertEquals("SEARCH", entry.getValue().getIntent());
        assertEquals("SEMANTIC", entry.getValue().getSearchMode());
        server.verify();
    }
}
