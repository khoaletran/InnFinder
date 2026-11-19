package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import java.util.Collections;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiEmbeddingServiceTest {
    @Test void usesSeparateRetrievalTaskTypes() {
        GeminiClient client = mock(GeminiClient.class);
        when(client.post(anyString(), anyString(), anyMap())).thenReturn(new ObjectMapper().valueToTree(
                Map.of("embedding", Map.of("values", Collections.nCopies(768, 1.0)))));
        AiEmbeddingService service = new AiEmbeddingService(client);
        service.getEmbedding("tìm phòng");
        service.getDocumentEmbedding("phòng có máy lạnh");
        verify(client).post(eq("gemini-embedding-001"), eq("embedContent"), argThat(b -> "RETRIEVAL_QUERY".equals(b.get("taskType"))));
        verify(client).post(eq("gemini-embedding-001"), eq("embedContent"), argThat(b -> "RETRIEVAL_DOCUMENT".equals(b.get("taskType"))));
    }

    @Test void providerFailureNeverCreatesAnIncompatibleFallbackVector() {
        GeminiClient client = mock(GeminiClient.class);
        when(client.post(anyString(), anyString(), anyMap())).thenThrow(new AppException(ErrorCode.AI_UNAVAILABLE));
        assertThrows(AppException.class, () -> new AiEmbeddingService(client).getEmbedding("tìm phòng"));
    }

    @Test void rejectsWrongDimensionsAndMalformedValues() {
        GeminiClient client = mock(GeminiClient.class);
        when(client.post(anyString(), anyString(), anyMap())).thenReturn(new ObjectMapper().valueToTree(
                Map.of("embedding", Map.of("values", Collections.nCopies(12, 1.0)))));
        assertThrows(AppException.class, () -> new AiEmbeddingService(client).getEmbedding("phòng"));
        assertEquals(0, new AiEmbeddingService(client).cosineSimilarity(Collections.nCopies(768, 1.0), Collections.nCopies(12, 1.0)));
        assertEquals(1, new AiEmbeddingService(client).cosineSimilarity(Collections.nCopies(768, 1.0), Collections.nCopies(768, 2.0)), 0.000001);
    }

    @Test void missingKeyHasClearBusinessError() {
        GeminiClient client = new GeminiClient(new ObjectMapper(), "", "gemini-3.5-flash-lite");
        AppException ex = assertThrows(AppException.class, () -> client.generate("hi", "hi", null));
        assertEquals(ErrorCode.AI_NOT_CONFIGURED, ex.getErrorCode());
    }
}
