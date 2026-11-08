package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
@Slf4j
public class AiEmbeddingService {

    private static final int EMBEDDING_DIMENSION = 768;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AiEmbeddingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Chuẩn hóa từ khóa tìm kiếm và sửa các lỗi gõ Telex phổ biến
     */
    public String normalizeQuery(String text) {
        if (text == null) return "";
        String normalized = text.trim();
        normalized = normalized.replaceAll("(?i)\\bphongf\\b", "phòng")
                .replaceAll("(?i)\\btroj\\b", "trọ")
                .replaceAll("(?i)\\bgias\\b", "giá")
                .replaceAll("(?i)\\brer\\b", "rẻ")
                .replaceAll("(?i)\\bddepj\\b", "đẹp")
                .replaceAll("(?i)\\bxepx\\b", "xép");
        return normalized;
    }

    /**
     * Sinh Vector Embedding từ đoạn văn bản (Sử dụng Google Gemini gemini-embedding-001)
     * Có cơ chế tự động Fallback sang Semantic N-gram Vector nếu chưa cấu hình API Key hoặc gặp lỗi mạng.
     */
    public List<Double> getEmbedding(String text) {
        if (text == null || text.isBlank()) {
            return Collections.nCopies(EMBEDDING_DIMENSION, 0.0);
        }

        String cleanedText = normalizeQuery(text);

        // 1. Gọi Google Gemini gemini-embedding-001 nếu có API Key
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty() && !geminiApiKey.contains("your_gemini_api_key")) {
            try {
                List<Double> geminiVector = fetchGeminiEmbedding(cleanedText);
                if (geminiVector != null && !geminiVector.isEmpty()) {
                    return geminiVector;
                }
            } catch (Exception ex) {
                log.warn("Không thể gọi Gemini API Embedding (đang tự động dùng Semantic Vector cục bộ): {}", ex.getMessage());
            }
        }

        // 2. Fallback: Sinh Semantic N-gram Vector 768 chiều (Không phụ thuộc mạng ngoài)
        return generateDeterministicSemanticVector(cleanedText);
    }

    private List<Double> fetchGeminiEmbedding(String text) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=" + geminiApiKey.trim();

        Map<String, Object> part = Map.of("text", text);
        Map<String, Object> content = Map.of("parts", List.of(part));
        Map<String, Object> payload = Map.of(
                "model", "models/gemini-embedding-001",
                "content", content,
                "outputDimensionality", EMBEDDING_DIMENSION
        );

        String jsonResponse = restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);

        if (jsonResponse != null) {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode valuesNode = root.path("embedding").path("values");
            if (valuesNode.isArray()) {
                List<Double> vector = new ArrayList<>(valuesNode.size());
                for (JsonNode val : valuesNode) {
                    vector.add(val.asDouble());
                }
                return vector;
            }
        }
        return null;
    }

    /**
     * Thuật toán sinh vector ngữ nghĩa 768 chiều dựa trên n-gram và ngữ nghĩa tiếng Việt
     * Đảm bảo các từ đồng nghĩa/cụm từ tương tự (như gác lửng/gác xép, thú cưng/chó mèo) có độ tương đồng cao.
     */
    public List<Double> generateDeterministicSemanticVector(String text) {
        double[] vector = new double[EMBEDDING_DIMENSION];
        String normalized = text.toLowerCase()
                .replaceAll("[.,;:!?()\"'\\[\\]{}\\\\/]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String[] tokens = normalized.split(" ");

        // Đồng nghĩa & trọng số từ khóa trong lĩnh vực phòng trọ
        Map<String, Integer> semanticClusters = Map.ofEntries(
                Map.entry("gác", 10), Map.entry("lửng", 10), Map.entry("xép", 10),
                Map.entry("mèo", 25), Map.entry("chó", 25), Map.entry("pet", 25), Map.entry("thú", 25),
                Map.entry("bếp", 40), Map.entry("nấu", 40), Map.entry("ăn", 40),
                Map.entry("ban", 55), Map.entry("công", 55), Map.entry("thoáng", 55), Map.entry("sổ", 55),
                Map.entry("máy", 70), Map.entry("giặt", 70), Map.entry("lạnh", 70), Map.entry("điều", 70),
                Map.entry("xe", 85), Map.entry("bus", 85), Map.entry("buýt", 85),
                Map.entry("rẻ", 100), Map.entry("sinh", 100), Map.entry("viên", 100)
        );

        for (int i = 0; i < tokens.length; i++) {
            String token = tokens[i];
            if (token.isBlank()) continue;

            // Kích hoạt cụm ngữ nghĩa
            for (Map.Entry<String, Integer> cluster : semanticClusters.entrySet()) {
                if (token.contains(cluster.getKey())) {
                    int slot = (cluster.getValue() * 7) % EMBEDDING_DIMENSION;
                    vector[slot] += 2.0;
                    vector[(slot + 1) % EMBEDDING_DIMENSION] += 1.5;
                }
            }

            // Băm token (N-gram 1)
            int h1 = Math.abs(token.hashCode()) % EMBEDDING_DIMENSION;
            vector[h1] += 1.0;

            // Băm bi-gram (2 từ liên tiếp)
            if (i < tokens.length - 1) {
                String biGram = token + "_" + tokens[i + 1];
                int h2 = Math.abs(biGram.hashCode()) % EMBEDDING_DIMENSION;
                vector[h2] += 1.5;
            }
        }

        // Chuẩn hóa vector đơn vị (Unit Vector L2-norm)
        double norm = 0.0;
        for (double v : vector) {
            norm += v * v;
        }
        norm = Math.sqrt(norm);
        if (norm > 0) {
            for (int i = 0; i < vector.length; i++) {
                vector[i] /= norm;
            }
        }

        List<Double> result = new ArrayList<>(EMBEDDING_DIMENSION);
        for (double v : vector) {
            result.add(v);
        }
        return result;
    }

    /**
     * Tính độ tương đồng Cosine Similarity giữa 2 vector (-1.0 đến 1.0)
     */
    public double cosineSimilarity(List<Double> vecA, List<Double> vecB) {
        if (vecA == null || vecB == null || vecA.isEmpty() || vecB.isEmpty()) {
            return 0.0;
        }
        int size = Math.min(vecA.size(), vecB.size());
        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < size; i++) {
            double a = vecA.get(i);
            double b = vecB.get(i);
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }

        if (normA <= 0.0 || normB <= 0.0) {
            return 0.0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
