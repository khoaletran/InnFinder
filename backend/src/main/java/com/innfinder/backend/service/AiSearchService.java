package com.innfinder.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.room.RoomFilterRequest;
import com.innfinder.backend.entity.PhongTroVector;
import com.innfinder.backend.repository.PhongTroVectorRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiSearchService {
    private final RoomDiscoveryService discovery;
    private final PhongTroVectorRepository vectors;
    private final AiEmbeddingService embedding;
    private final GeminiClient gemini;
    private final ObjectMapper mapper;

    public record Result(List<RoomDiscoveryService.Document> rooms, String mode) {}
    private record Scored(RoomDiscoveryService.Document room, double score) {}

    /** Includes newly approved/edited rooms; never holds a DB transaction during provider calls. */
    @Scheduled(initialDelay = 10000, fixedDelayString = "${gemini.index-delay-ms:60000}")
    public void indexAllApprovedRooms() {
        if (!gemini.isConfigured()) return;
        try {
            Map<String, PhongTroVector> existing = vectors.findAll().stream()
                    .collect(Collectors.toMap(PhongTroVector::getMaPhongTro, v -> v));
            int indexed = 0;
            for (RoomDiscoveryService.Document room : discovery.find(new RoomFilterRequest())) {
                String id = room.summary().getMaPhongTro();
                String hash = hash(room.text());
                if (existing.containsKey(id) && hash.equals(existing.get(id).getContentHash())) {
                    try {
                        List<Double> values = mapper.readValue(existing.get(id).getEmbeddingJson(), new TypeReference<List<Double>>() {});
                        if (AiEmbeddingService.isValidVector(values)) continue;
                    } catch (Exception ignored) { /* Repair corrupt vectors during the next indexing pass. */ }
                }
                vectors.saveAndFlush(PhongTroVector.builder().maPhongTro(id).contentHash(hash)
                        .embeddingJson(mapper.writeValueAsString(embedding.getDocumentEmbedding(room.text()))).build());
                if (++indexed >= 20) break;
            }
        } catch (Exception ex) {
            log.warn("Chưa thể cập nhật chỉ mục AI; sẽ thử lại ở lượt tiếp theo.");
        }
    }

    public Result search(String prompt, RoomFilterRequest filter, int limit, String sort) {
        List<RoomDiscoveryService.Document> candidates = discovery.find(filter);
        if (candidates.isEmpty()) return new Result(List.of(), "FILTERED");
        Map<String, PhongTroVector> stored = vectors.findAllById(candidates.stream()
                .map(r -> r.summary().getMaPhongTro()).toList()).stream()
                .collect(Collectors.toMap(PhongTroVector::getMaPhongTro, v -> v));
        Map<String, List<Double>> current = new HashMap<>();
        for (RoomDiscoveryService.Document room : candidates) {
            PhongTroVector vector = stored.get(room.summary().getMaPhongTro());
            if (vector == null || !hash(room.text()).equals(vector.getContentHash())) continue;
            try {
                List<Double> values = mapper.readValue(vector.getEmbeddingJson(), new TypeReference<List<Double>>() {});
                if (AiEmbeddingService.isValidVector(values)) current.put(room.summary().getMaPhongTro(), values);
            } catch (Exception ignored) { /* Never compare corrupt or old vectors. */ }
        }
        List<Double> query = null;
        // Do not wait for a query embedding if the candidate set is incomplete or the user explicitly sorts by price.
        if (current.size() == candidates.size() && !"PRICE_ASC".equals(sort) && !"PRICE_DESC".equals(sort)
                && prompt != null && !prompt.isBlank()) {
            try { query = embedding.getEmbedding(prompt); }
            catch (com.innfinder.backend.exception.AppException ignored) { /* Explicit FILTERED mode below. */ }
        }
        boolean semantic = query != null && current.size() == candidates.size();
        List<Scored> scored = new ArrayList<>();
        for (RoomDiscoveryService.Document room : candidates) {
            double score = semantic ? embedding.cosineSimilarity(query, current.get(room.summary().getMaPhongTro()))
                    : lexicalScore(prompt, room.text());
            scored.add(new Scored(room, score));
        }
        Comparator<Scored> order = Comparator.comparingDouble(Scored::score).reversed()
                .thenComparing(s -> s.room().summary().getMaPhongTro());
        if ("PRICE_ASC".equals(sort)) order = Comparator.comparingLong(s -> s.room().summary().getGiaThue());
        if ("PRICE_DESC".equals(sort)) order = Comparator.<Scored>comparingLong(s -> s.room().summary().getGiaThue()).reversed();
        boolean boostPhongTro = (filter == null || filter.getMaLpt() == null || filter.getMaLpt().isBlank())
                && prefersPhongTro(prompt);
        if (boostPhongTro) {
            order = Comparator.comparingInt((Scored s) -> isPhongTroCategory(s.room()) ? 0 : 1).thenComparing(order);
        }
        return new Result(scored.stream().sorted(order).limit(Math.clamp(limit, 1, 30)).map(Scored::room).toList(),
                semantic ? "SEMANTIC" : "FILTERED");
    }

    public static boolean prefersPhongTro(String prompt) {
        if (prompt == null || prompt.isBlank()) return false;
        String norm = normalize(prompt).replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        return norm.matches(".*(?:^|\\s)tro(?:\\s|$).*");
    }

    public static boolean isPhongTroCategory(RoomDiscoveryService.Document doc) {
        if (doc == null) return false;
        String typeName = doc.summary() != null && doc.summary().getTenLoaiPhong() != null
                ? doc.summary().getTenLoaiPhong()
                : (doc.detail() != null && doc.detail().getLoaiPhong() != null
                        ? doc.detail().getLoaiPhong().getTenLoaiPhongTro()
                        : null);
        if (typeName == null || typeName.isBlank()) return false;
        String norm = normalize(typeName).replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        return norm.contains("phong tro") || norm.matches(".*(?:^|\\s)tro(?:\\s|$).*");
    }

    public static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd');
    }

    private double lexicalScore(String query, String text) {
        String normalized = normalize(text);
        return Arrays.stream(normalize(query).split("\\s+")).filter(t -> t.length() > 2).distinct()
                .filter(normalized::contains).count();
    }

    private String hash(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest((AiEmbeddingService.INDEX_VERSION + text).getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
