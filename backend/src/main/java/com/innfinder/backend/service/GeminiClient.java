package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeoutException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/** All diagnostics use error codes only: never log a key, provider body, URL or conversation. */
@Service
@Slf4j
public class GeminiClient {
    private final RestClient client;
    private final RestClient embeddingClient;
    private final ObjectMapper mapper;
    private final String apiKey;
    private final String chatModel;
    private final Semaphore slots = new Semaphore(3);

    @Autowired
    public GeminiClient(ObjectMapper mapper, @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.chat-model:gemini-3.5-flash-lite}") String chatModel,
            @Value("${gemini.request-timeout-seconds:40}") int requestTimeout,
            @Value("${gemini.embedding-timeout-seconds:8}") int embeddingTimeout) {
        this(mapper, apiKey, chatModel, httpClient(requestTimeout), httpClient(Math.clamp(embeddingTimeout, 1, 8)));
    }

    public GeminiClient(ObjectMapper mapper, String apiKey, String chatModel) {
        this(mapper, apiKey, chatModel, 40, 8);
    }

    GeminiClient(ObjectMapper mapper, String apiKey, String chatModel, RestClient client, RestClient embeddingClient) {
        this.mapper = mapper;
        this.apiKey = apiKey;
        this.chatModel = chatModel;
        this.client = client;
        this.embeddingClient = embeddingClient;
    }

    private static RestClient httpClient(int seconds) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(Math.clamp(seconds, 1, 40)));
        return RestClient.builder().baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .requestFactory(factory).build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.contains("your_gemini_api_key");
    }

    public JsonNode post(String model, String method, Map<String, Object> body) {
        if (!isConfigured()) throw new AppException(ErrorCode.AI_NOT_CONFIGURED);
        if (!model.matches("[a-zA-Z0-9._-]+")) throw new AppException(ErrorCode.AI_MODEL_UNAVAILABLE);
        if (!slots.tryAcquire()) throw new AppException(ErrorCode.AI_BUSY);
        long start = System.nanoTime();
        try {
            RestClient selected = "embedContent".equals(method) ? embeddingClient : client;
            String result = selected.post().uri("/models/{model}:{method}", model, method)
                    .header("x-goog-api-key", apiKey.trim()).contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(String.class);
            if (result == null) throw new AppException(ErrorCode.AI_INVALID_RESPONSE);
            return mapper.readTree(result);
        } catch (AppException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            ErrorCode code = providerError(ex);
            log.warn("Gemini {}: {} (HTTP {}, {} ms)", method, code.name(), ex.getStatusCode().value(), elapsed(start));
            throw new AppException(code);
        } catch (RestClientException ex) {
            ErrorCode code = isTimeout(ex) ? ErrorCode.AI_TIMEOUT : ErrorCode.AI_CONNECTION_FAILED;
            log.warn("Gemini {}: {} ({} ms)", method, code.name(), elapsed(start));
            throw new AppException(code);
        } catch (Exception ex) {
            throw new AppException(ErrorCode.AI_INVALID_RESPONSE);
        } finally {
            slots.release();
        }
    }

    private ErrorCode providerError(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        if (status == 429) return ErrorCode.AI_QUOTA_EXCEEDED;
        if (status == 401) return ErrorCode.AI_CREDENTIALS_INVALID;
        if (status == 404) return ErrorCode.AI_MODEL_UNAVAILABLE;
        if (status == 408 || status == 504) return ErrorCode.AI_TIMEOUT;
        // Read only known machine codes. Provider prose may contain credentials and is never logged or returned.
        try {
            JsonNode error = mapper.readTree(ex.getResponseBodyAsString()).path("error");
            for (JsonNode detail : error.path("details")) {
                if (List.of("API_KEY_INVALID", "API_KEY_EXPIRED", "API_KEY_NOT_FOUND").contains(detail.path("reason").asText())) {
                    return ErrorCode.AI_CREDENTIALS_INVALID;
                }
            }
            if ("UNAUTHENTICATED".equals(error.path("status").asText())) return ErrorCode.AI_CREDENTIALS_INVALID;
        } catch (Exception ignored) { /* Status still provides a safe fallback. */ }
        if (status == 403) return ErrorCode.AI_ACCESS_DENIED;
        if (status == 400 || status == 422) return ErrorCode.AI_REQUEST_REJECTED;
        return ErrorCode.AI_UNAVAILABLE;
    }

    private static boolean isTimeout(Throwable ex) {
        for (int i = 0; ex != null && i < 12; i++, ex = ex.getCause()) {
            if (ex instanceof HttpTimeoutException || ex instanceof SocketTimeoutException || ex instanceof TimeoutException) return true;
        }
        return false;
    }

    private static long elapsed(long start) { return (System.nanoTime() - start) / 1_000_000; }

    public String generate(String instruction, String data, Map<String, Object> schema) {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("maxOutputTokens", schema == null ? 600 : 1200);
        if (chatModel.startsWith("gemini-3")) {
            String level = chatModel.matches("gemini-(3\\.5-flash-lite.*|3\\.1-flash-lite.*|3-flash.*|3\\.6-flash.*)") ? "MINIMAL" : "LOW";
            config.put("thinkingConfig", Map.of("thinkingLevel", level));
        }
        if (schema != null) {
            config.put("responseMimeType", "application/json");
            config.put("responseSchema", schema);
        }
        JsonNode result = post(chatModel, "generateContent", Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", instruction))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", data)))),
                "generationConfig", config));
        JsonNode candidate = result.path("candidates").path(0);
        if (!"STOP".equals(candidate.path("finishReason").asText())) throw new AppException(ErrorCode.AI_INVALID_RESPONSE);
        StringBuilder text = new StringBuilder();
        for (JsonNode part : candidate.path("content").path("parts")) {
            if (!part.path("thought").asBoolean(false)) text.append(part.path("text").asText(""));
        }
        if (text.isEmpty()) throw new AppException(ErrorCode.AI_INVALID_RESPONSE);
        return text.toString().trim();
    }
}
