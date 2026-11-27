package com.innfinder.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * HTTP REST client kết nối Firebase Realtime Database (RTDB) cho tính năng Ở ghép.
 * Hỗ trợ xác thực bằng Service Account JSON (OAuth2), database secret, hoặc public rules.
 */
@Component
@Slf4j
public class RoommateRealtimeDbClient {

    private static final List<String> RTDB_SCOPES = List.of(
            "https://www.googleapis.com/auth/firebase.database",
            "https://www.googleapis.com/auth/userinfo.email"
    );

    private final String baseUrl;
    private final String rtdbSecret;
    private final String credentialsFile;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private volatile ServiceAccountCredentials credentials;

    public RoommateRealtimeDbClient(
            @Value("${innfinder.firebase.rtdb-url:}") String baseUrl,
            @Value("${innfinder.firebase.rtdb-secret:}") String rtdbSecret,
            @Value("${innfinder.firestore.credentials-file:}") String credentialsFile,
            ObjectMapper objectMapper
    ) {
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim().replaceAll("/+$", "");
        this.rtdbSecret = rtdbSecret == null ? "" : rtdbSecret.trim();
        this.credentialsFile = credentialsFile == null ? "" : credentialsFile.trim();
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public <T> T get(String path, TypeReference<T> typeRef) {
        String body = execute("GET", path, null);
        if (body == null || body.isBlank() || "null".equals(body.trim())) {
            return null;
        }
        try {
            return objectMapper.readValue(body, typeRef);
        } catch (IOException e) {
            log.warn("Không thể đọc dữ liệu RTDB tại {}: {}", path, e.getMessage());
            throw new AppException(ErrorCode.ROOMMATE_UNAVAILABLE);
        }
    }

    public String post(String path, Object payload) {
        String body = execute("POST", path, payload);
        try {
            Map<String, String> res = objectMapper.readValue(body, new TypeReference<>() {});
            String name = res != null ? res.get("name") : null;
            if (name == null || name.isBlank()) {
                throw new AppException(ErrorCode.ROOMMATE_UNAVAILABLE);
            }
            return name;
        } catch (IOException e) {
            log.warn("Không thể parse key trả về từ RTDB POST {}: {}", path, e.getMessage());
            throw new AppException(ErrorCode.ROOMMATE_UNAVAILABLE);
        }
    }

    public void put(String path, Object payload) {
        execute("PUT", path, payload);
    }

    public void patch(String path, Object payload) {
        execute("PATCH", path, payload);
    }

    public void delete(String path) {
        execute("DELETE", path, null);
    }

    private String execute(String method, String path, Object payload) {
        if (baseUrl.isBlank()) {
            log.warn("Chưa cấu hình innfinder.firebase.rtdb-url");
            throw new AppException(ErrorCode.ROOMMATE_UNAVAILABLE);
        }

        try {
            String normalizedPath = path.startsWith("/") ? path : "/" + path;
            String authQuery = resolveAuthQuery();
            String url = baseUrl + normalizedPath + ".json" + authQuery;

            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Accept", "application/json");

            if (payload != null) {
                String json = objectMapper.writeValueAsString(payload);
                builder.header("Content-Type", "application/json");
                builder.method(method, HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
            } else {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Firebase RTDB {} {} thất bại (HTTP {}): {}", method, normalizedPath, response.statusCode(), response.body());
                throw new AppException(ErrorCode.ROOMMATE_UNAVAILABLE);
            }
            return response.body();
        } catch (AppException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.ROOMMATE_UNAVAILABLE);
        } catch (Exception ex) {
            log.warn("Lỗi kết nối Firebase RTDB ({} {}): {}", method, path, ex.getMessage());
            throw new AppException(ErrorCode.ROOMMATE_UNAVAILABLE);
        }
    }

    private String resolveAuthQuery() throws IOException {
        if (!credentialsFile.isBlank()) {
            ServiceAccountCredentials creds = getOrLoadCredentials();
            creds.refreshIfExpired();
            AccessToken token = creds.getAccessToken();
            if (token != null && token.getTokenValue() != null) {
                return "?access_token=" + URLEncoder.encode(token.getTokenValue(), StandardCharsets.UTF_8);
            }
        }
        if (!rtdbSecret.isBlank()) {
            return "?auth=" + URLEncoder.encode(rtdbSecret, StandardCharsets.UTF_8);
        }
        return "";
    }

    private ServiceAccountCredentials getOrLoadCredentials() throws IOException {
        if (credentials != null) {
            return credentials;
        }
        synchronized (this) {
            if (credentials == null) {
                Path filePath = Path.of(credentialsFile);
                if (!Files.isRegularFile(filePath)) {
                    throw new IOException("Không tìm thấy file Firebase credentials: " + credentialsFile);
                }
                try (var stream = Files.newInputStream(filePath)) {
                    credentials = (ServiceAccountCredentials) ServiceAccountCredentials
                            .fromStream(stream)
                            .createScoped(RTDB_SCOPES);
                }
            }
            return credentials;
        }
    }
}
