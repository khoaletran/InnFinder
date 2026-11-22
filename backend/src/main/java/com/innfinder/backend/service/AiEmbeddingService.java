package com.innfinder.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AiEmbeddingService {
    public static final String INDEX_VERSION = "gemini-embedding-001:768:retrieval:v3:";
    private final GeminiClient gemini;
    public List<Double> getEmbedding(String text) { return embed(text, "RETRIEVAL_QUERY"); }
    public List<Double> getDocumentEmbedding(String text) { return embed(text, "RETRIEVAL_DOCUMENT"); }

    private List<Double> embed(String text, String task) {
        if (text == null || text.isBlank()) throw new AppException(ErrorCode.INVALID_KEY);
        JsonNode result = gemini.post("gemini-embedding-001", "embedContent", Map.of(
                "model", "models/gemini-embedding-001", "taskType", task,
                "outputDimensionality", 768,
                "content", Map.of("parts", List.of(Map.of("text", text)))));
        JsonNode values = result.path("embedding").path("values");
        if (!values.isArray() || values.size() != 768) throw new AppException(ErrorCode.AI_UNAVAILABLE);
        List<Double> vector = new ArrayList<>(768);
        for (JsonNode value : values) {
            if (!value.isNumber() || !Double.isFinite(value.asDouble())) throw new AppException(ErrorCode.AI_UNAVAILABLE);
            vector.add(value.asDouble());
        }
        if (!isValidVector(vector)) throw new AppException(ErrorCode.AI_UNAVAILABLE);
        return vector;
    }

    public static boolean isValidVector(List<Double> values) {
        return values != null && values.size() == 768
                && values.stream().allMatch(v -> v != null && Double.isFinite(v))
                && values.stream().anyMatch(v -> v != 0);
    }

    public double cosineSimilarity(List<Double> a, List<Double> b) {
        if (!isValidVector(a) || !isValidVector(b)) return 0;
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.size(); i++) {
            if (a.get(i) == null || b.get(i) == null
                    || !Double.isFinite(a.get(i)) || !Double.isFinite(b.get(i))) return 0;
            dot += a.get(i) * b.get(i);
            normA += a.get(i) * a.get(i);
            normB += b.get(i) * b.get(i);
        }
        return normA > 0 && normB > 0 ? dot / Math.sqrt(normA * normB) : 0;
    }
}
