package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import java.net.SocketTimeoutException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiClientTest {
    private record Fixture(GeminiClient client, MockRestServiceServer server) {}
    private Fixture fixture() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://generativelanguage.googleapis.com/v1beta");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClient transport = builder.build();
        return new Fixture(new GeminiClient(new ObjectMapper(), "test-key", "gemini-3.5-flash-lite", transport, transport), server);
    }

    @Test void separatesQuotaCredentialsPermissionsAndMissingModel() {
        List<HttpStatus> statuses = List.of(HttpStatus.TOO_MANY_REQUESTS, HttpStatus.UNAUTHORIZED,
                HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST, HttpStatus.SERVICE_UNAVAILABLE);
        List<ErrorCode> codes = List.of(ErrorCode.AI_QUOTA_EXCEEDED, ErrorCode.AI_CREDENTIALS_INVALID,
                ErrorCode.AI_ACCESS_DENIED, ErrorCode.AI_MODEL_UNAVAILABLE, ErrorCode.AI_REQUEST_REJECTED, ErrorCode.AI_UNAVAILABLE);
        for (int i = 0; i < statuses.size(); i++) {
            Fixture f = fixture();
            f.server().expect(anything()).andRespond(withStatus(statuses.get(i)).contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":{\"message\":\"test-sensitive-provider-message\"}}"));
            AppException ex = assertThrows(AppException.class, () -> f.client().generate("instruction", "data", null));
            assertEquals(codes.get(i), ex.getErrorCode());
            assertFalse(ex.getMessage().contains("test-sensitive-provider-message"));
            f.server().verify();
        }
    }

    @Test void invalidKeyIn400UsesProviderMachineReason() {
        Fixture f = fixture();
        f.server().expect(anything()).andRespond(withBadRequest().contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":{\"details\":[{\"reason\":\"API_KEY_INVALID\"}]}}"));
        assertEquals(ErrorCode.AI_CREDENTIALS_INVALID,
                assertThrows(AppException.class, () -> f.client().generate("hi", "hi", null)).getErrorCode());
    }

    @Test void socketTimeoutIsNotReportedAsInvalidKeyOrGenericDisconnect() {
        Fixture f = fixture();
        f.server().expect(anything()).andRespond(request -> { throw new SocketTimeoutException("test timeout"); });
        assertEquals(ErrorCode.AI_TIMEOUT,
                assertThrows(AppException.class, () -> f.client().generate("hi", "hi", null)).getErrorCode());
    }

    @Test void malformedProviderJsonAndTruncatedOutputHaveSpecificErrors() {
        Fixture malformed = fixture();
        malformed.server().expect(anything()).andRespond(withSuccess("not json", MediaType.APPLICATION_JSON));
        assertEquals(ErrorCode.AI_INVALID_RESPONSE,
                assertThrows(AppException.class, () -> malformed.client().generate("hi", "hi", null)).getErrorCode());
        Fixture truncated = fixture();
        truncated.server().expect(anything()).andRespond(withSuccess("{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\"}]}", MediaType.APPLICATION_JSON));
        assertEquals(ErrorCode.AI_INVALID_RESPONSE,
                assertThrows(AppException.class, () -> truncated.client().generate("hi", "hi", null)).getErrorCode());
    }

    @Test void keepsStructuredOutputAndUsesMinimalThinkingWithSmallerTokenBudget() {
        Fixture f = fixture();
        f.server().expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andExpect(header("x-goog-api-key", "test-key"))
                .andExpect(content().json("{\"generationConfig\":{\"maxOutputTokens\":1200,\"thinkingConfig\":{\"thinkingLevel\":\"MINIMAL\"},\"responseMimeType\":\"application/json\"}}"))
                .andRespond(withSuccess("{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"thought\":true,\"text\":\"hidden\"},{\"text\":\"OK\"}]}}]}", MediaType.APPLICATION_JSON));
        assertEquals("OK", f.client().generate("instruction", "data", Map.of("type", "OBJECT")));
        f.server().verify();
    }

    @Test void fallsBackFromGemini38ToFastLiteModelOnTransientError() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://generativelanguage.googleapis.com/v1beta");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClient transport = builder.build();
        GeminiClient client = new GeminiClient(new ObjectMapper(), "test-key", "gemini-3.8-flash", "gemini-3.5-flash-lite", transport, transport);

        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"))
                .andExpect(header("x-goog-api-key", "test-key"))
                .andExpect(content().json("{\"generationConfig\":{\"thinkingConfig\":{\"thinkingLevel\":\"LOW\"}}}"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"high demand\"}}"));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andExpect(header("x-goog-api-key", "test-key"))
                .andExpect(content().json("{\"generationConfig\":{\"thinkingConfig\":{\"thinkingLevel\":\"MINIMAL\"}}}"))
                .andRespond(withSuccess("{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"OK\"}]}}]}", MediaType.APPLICATION_JSON));

        assertEquals("OK", client.generate("instruction", "data", Map.of("type", "OBJECT")));
        server.verify();
    }
}
