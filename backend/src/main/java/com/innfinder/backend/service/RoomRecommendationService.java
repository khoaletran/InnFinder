package com.innfinder.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.room.RoomFilterRequest;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.entity.AiUsageLog;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.PhongTroVector;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.repository.PhongTroVectorRepository;
import com.innfinder.backend.security.SecurityUtils;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hybrid Room Recommendation engine reusing stored 768-dim room vectors (0 Gemini API tokens),
 * price/location/type affinity, landlord reputation, and user favorites/bookings/recent views.
 */
@Service
@RequiredArgsConstructor
public class RoomRecommendationService {

    private final RoomDiscoveryService discovery;
    private final PhongTroVectorRepository vectorRepository;
    private final AiEmbeddingService embeddingService;
    private final NguoiDungRepository nguoiDungRepository;
    private final PhieuDatLichRepository phieuDatLichRepository;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private AiTrackingService trackingService;

    private record ScoredRoom(RoomSummaryResponse room, double score) {}

    @Transactional(readOnly = true)
    public List<RoomSummaryResponse> getSimilarRooms(String roomId, int limit) {
        long start = System.nanoTime();
        int safeLimit = Math.clamp(limit, 1, 20);
        List<RoomDiscoveryService.Document> allDocs = discovery.findRecommendationCandidates();
        if (allDocs.isEmpty()) return List.of();

        List<RoomDiscoveryService.Document> targetDocs = discovery.findByIds(List.of(roomId));
        RoomSummaryResponse target = targetDocs.stream()
                .map(RoomDiscoveryService.Document::summary)
                .filter(r -> roomId.equals(r.getMaPhongTro()))
                .findFirst()
                .orElse(null);

        if (target == null) {
            return getTopQualityRooms(allDocs, Set.of(roomId), safeLimit);
        }

        Map<String, List<Double>> vectorMap = new HashMap<>(loadValidVectors(allDocs));
        vectorMap.putAll(loadValidVectors(targetDocs));
        List<Double> targetVector = vectorMap.get(roomId);

        List<RoomSummaryResponse> results = allDocs.stream()
                .map(RoomDiscoveryService.Document::summary)
                .filter(c -> !roomId.equals(c.getMaPhongTro()))
                .map(c -> new ScoredRoom(c, scoreSimilar(target, targetVector, c, vectorMap.get(c.getMaPhongTro()))))
                .sorted(Comparator.comparingDouble(ScoredRoom::score).reversed()
                        .thenComparing(s -> s.room().getMaPhongTro()))
                .limit(safeLimit)
                .map(ScoredRoom::room)
                .toList();

        recordEvent("RECOMMENDATION", targetVector != null ? "HYBRID_VECTOR" : "HYBRID_META",
                "similar:" + roomId + ";count=" + results.size(), start);
        return results;
    }

    @Transactional(readOnly = true)
    public List<RoomSummaryResponse> getPersonalizedRecommendations(List<String> recentIds, int limit) {
        long start = System.nanoTime();
        int safeLimit = Math.clamp(limit, 1, 24);
        List<RoomDiscoveryService.Document> allDocs = discovery.findRecommendationCandidates();
        if (allDocs.isEmpty()) return List.of();

        Map<String, RoomSummaryResponse> roomById = allDocs.stream()
                .map(RoomDiscoveryService.Document::summary)
                .collect(Collectors.toMap(RoomSummaryResponse::getMaPhongTro, r -> r, (a, b) -> a));

        Map<String, Double> seedWeights = new LinkedHashMap<>();
        Set<String> bookedIds = new HashSet<>();

        String username = SecurityUtils.getCurrentUsername();
        if (username != null) {
            NguoiDung user = nguoiDungRepository.findByTenDangNhap(username).orElse(null);
            if (user != null) {
                if (user.getDsPhongYeuThich() != null) {
                    for (PhongTro fav : user.getDsPhongYeuThich().stream().limit(50).toList()) {
                        seedWeights.merge(fav.getMaPhongTro(), 1.0, Math::max);
                    }
                }
                List<PhieuDatLich> bookings = phieuDatLichRepository.findTop10ByKhachHang_MaNguoiDungOrderByNgayHenDesc(user.getMaNguoiDung());
                for (int i = 0; i < Math.min(bookings.size(), 10); i++) {
                    PhieuDatLich b = bookings.get(i);
                    if (b.getPhongTro() != null && b.getTrangThai() != com.innfinder.backend.entity.enums.TrangThaiDatLich.HUY) {
                        String id = b.getPhongTro().getMaPhongTro();
                        bookedIds.add(id);
                        seedWeights.merge(id, 0.7, Math::max);
                    }
                }
            }
        }

        if (recentIds != null) {
            for (String recentId : recentIds.stream().limit(8).toList()) {
                if (recentId != null && !recentId.isBlank()) {
                    seedWeights.merge(recentId.trim(), 0.5, Math::max);
                }
            }
        }

        if (seedWeights.isEmpty()) {
            List<RoomSummaryResponse> coldStart = getTopQualityRooms(allDocs, Set.of(), safeLimit);
            recordEvent("RECOMMENDATION", "COLD_START", "personalized;count=" + coldStart.size(), start);
            return coldStart;
        }

        List<RoomDiscoveryService.Document> seedDocs = discovery.findPreferenceSeeds(new ArrayList<>(seedWeights.keySet()));
        seedDocs.forEach(doc -> roomById.put(doc.summary().getMaPhongTro(), doc.summary()));
        Map<String, List<Double>> vectorMap = new HashMap<>(loadValidVectors(allDocs));
        vectorMap.putAll(loadValidVectors(seedDocs));
        double[] userVector = buildUserVector(seedWeights, vectorMap);
        double avgPreferredPrice = computeWeightedPrice(seedWeights, roomById);
        Set<String> preferredTypes = seedWeights.keySet().stream()
                .map(roomById::get)
                .filter(Objects::nonNull)
                .map(RoomSummaryResponse::getMaLpt)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<RoomSummaryResponse> candidates = allDocs.stream()
                .map(RoomDiscoveryService.Document::summary)
                .filter(r -> !bookedIds.contains(r.getMaPhongTro()))
                .toList();


        List<Double> userVecList = userVector != null ? toList(userVector) : null;
        List<RoomSummaryResponse> results = candidates.stream()
                .map(c -> new ScoredRoom(c, scorePersonalized(
                        c, userVecList, vectorMap.get(c.getMaPhongTro()), avgPreferredPrice, preferredTypes)))
                .sorted(Comparator.comparingDouble(ScoredRoom::score).reversed()
                        .thenComparing(s -> s.room().getMaPhongTro()))
                .limit(safeLimit)
                .map(ScoredRoom::room)
                .toList();

        recordEvent("RECOMMENDATION", userVecList != null ? "PERSONALIZED_VECTOR" : "PERSONALIZED_META",
                "seeds=" + seedWeights.size() + ";count=" + results.size(), start);
        return results;
    }

    private double scoreSimilar(RoomSummaryResponse target, List<Double> targetVec,
                                RoomSummaryResponse candidate, List<Double> candVec) {
        double vectorScore = (targetVec != null && candVec != null)
                ? Math.max(0.0, embeddingService.cosineSimilarity(targetVec, candVec)) * 0.50
                : 0.0;
        double priceScore = computePriceAffinity(target.getGiaThue(), candidate.getGiaThue()) * 0.20;
        double typeScore = Objects.equals(target.getMaLpt(), candidate.getMaLpt()) ? 0.08 : 0.0;
        double geoScore = computeGeoProximity(target, candidate) * 0.12;
        double repScore = (Math.clamp(candidate.getDiemUyTinChuTro() != null ? candidate.getDiemUyTinChuTro() : 100, 0, 100) / 100.0) * 0.10;
        return vectorScore + priceScore + typeScore + geoScore + repScore;
    }

    private double scorePersonalized(RoomSummaryResponse candidate, List<Double> userVec, List<Double> candVec,
                                     double avgPrice, Set<String> preferredTypes) {
        double vectorScore = (userVec != null && candVec != null)
                ? Math.max(0.0, embeddingService.cosineSimilarity(userVec, candVec)) * 0.55
                : 0.0;
        double priceScore = avgPrice > 0
                ? computePriceAffinity(Math.round(avgPrice), candidate.getGiaThue()) * 0.20
                : 0.10;
        double typeScore = preferredTypes.contains(candidate.getMaLpt()) ? 0.10 : 0.0;
        double repScore = (Math.clamp(candidate.getDiemUyTinChuTro() != null ? candidate.getDiemUyTinChuTro() : 100, 0, 100) / 100.0) * 0.10;
        double recencyScore = computeRecencyScore(candidate.getThoiGianDang()) * 0.05;
        return vectorScore + priceScore + typeScore + repScore + recencyScore;
    }

    private List<RoomSummaryResponse> getTopQualityRooms(List<RoomDiscoveryService.Document> allDocs,
                                                         Set<String> excludeIds, int limit) {
        return allDocs.stream()
                .map(RoomDiscoveryService.Document::summary)
                .filter(r -> !excludeIds.contains(r.getMaPhongTro()))
                .map(r -> {
                    double rep = Math.clamp(r.getDiemUyTinChuTro() != null ? r.getDiemUyTinChuTro() : 100, 0, 100) / 100.0;
                    double rec = computeRecencyScore(r.getThoiGianDang());
                    return new ScoredRoom(r, rep * 0.70 + rec * 0.30);
                })
                .sorted(Comparator.comparingDouble(ScoredRoom::score).reversed()
                        .thenComparing(s -> s.room().getMaPhongTro()))
                .limit(limit)
                .map(ScoredRoom::room)
                .toList();
    }

    private Map<String, List<Double>> loadValidVectors(List<RoomDiscoveryService.Document> docs) {
        List<String> ids = docs.stream().map(d -> d.summary().getMaPhongTro()).toList();
        if (ids.isEmpty()) return Map.of();
        Map<String, String> expected = docs.stream().collect(Collectors.toMap(d -> d.summary().getMaPhongTro(), d -> AiSearchService.hash(d.text())));
        Map<String, List<Double>> result = new HashMap<>();
        for (PhongTroVector v : vectorRepository.findAllById(ids)) {
            try {
                if (!Objects.equals(expected.get(v.getMaPhongTro()), v.getContentHash())) continue;
                List<Double> values = objectMapper.readValue(v.getEmbeddingJson(), new TypeReference<List<Double>>() {});
                if (AiEmbeddingService.isValidVector(values)) {
                    result.put(v.getMaPhongTro(), values);
                }
            } catch (Exception ignored) { /* Skip malformed vectors safely. */ }
        }
        return result;
    }

    private double[] buildUserVector(Map<String, Double> seedWeights, Map<String, List<Double>> vectorMap) {
        double[] acc = null;
        double totalWeight = 0.0;
        for (Map.Entry<String, Double> entry : seedWeights.entrySet()) {
            List<Double> vec = vectorMap.get(entry.getKey());
            if (vec == null || vec.size() != 768) continue;
            if (acc == null) acc = new double[768];
            double w = entry.getValue();
            for (int i = 0; i < 768; i++) {
                acc[i] += vec.get(i) * w;
            }
            totalWeight += w;
        }
        if (acc == null || totalWeight <= 0) return null;
        for (int i = 0; i < 768; i++) {
            acc[i] /= totalWeight;
        }
        return acc;
    }

    private List<Double> toList(double[] arr) {
        List<Double> list = new ArrayList<>(arr.length);
        for (double v : arr) list.add(v);
        return list;
    }

    private double computeWeightedPrice(Map<String, Double> seedWeights, Map<String, RoomSummaryResponse> roomById) {
        double sum = 0.0;
        double weights = 0.0;
        for (Map.Entry<String, Double> e : seedWeights.entrySet()) {
            RoomSummaryResponse r = roomById.get(e.getKey());
            if (r != null && r.getGiaThue() != null && r.getGiaThue() > 0) {
                sum += r.getGiaThue() * e.getValue();
                weights += e.getValue();
            }
        }
        return weights > 0 ? sum / weights : 0.0;
    }

    private double computePriceAffinity(Long targetPrice, Long candPrice) {
        if (targetPrice == null || candPrice == null || targetPrice <= 0) return 0.5;
        double diffRatio = Math.abs(candPrice - targetPrice) / (double) targetPrice;
        return Math.max(0.0, 1.0 - Math.min(1.0, diffRatio / 0.60));
    }

    private double computeGeoProximity(RoomSummaryResponse a, RoomSummaryResponse b) {
        try {
            if (a.getViDo() == null || a.getKinhDo() == null || b.getViDo() == null || b.getKinhDo() == null) {
                return 0.0;
            }
            double lat1 = Double.parseDouble(a.getViDo());
            double lon1 = Double.parseDouble(a.getKinhDo());
            double lat2 = Double.parseDouble(b.getViDo());
            double lon2 = Double.parseDouble(b.getKinhDo());
            double dLat = Math.toRadians(lat2 - lat1);
            double dLon = Math.toRadians(lon2 - lon1);
            double sinLat = Math.sin(dLat / 2);
            double sinLon = Math.sin(dLon / 2);
            double h = sinLat * sinLat + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * sinLon * sinLon;
            double km = 6371.0 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
            return Math.max(0.0, 1.0 - Math.min(1.0, km / 8.0));
        } catch (Exception ex) {
            return 0.0;
        }
    }

    private double computeRecencyScore(LocalDateTime createdAt) {
        if (createdAt == null) return 0.5;
        long days = Math.max(0, ChronoUnit.DAYS.between(createdAt, LocalDateTime.now()));
        return Math.max(0.0, 1.0 - Math.min(1.0, days / 30.0));
    }

    private void recordEvent(String feature, String mode, String summary, long startNanos) {
        if (trackingService == null) return;
        trackingService.recordAsync(AiUsageLog.builder()
                .traceId(UUID.randomUUID().toString())
                .feature(feature)
                .searchMode(mode)
                .model("hybrid-recommender")
                .isFallback(false)
                .cacheHit(false)
                .maNguoiDung(SecurityUtils.getCurrentUsername())
                .latencyMs((System.nanoTime() - startNanos) / 1_000_000)
                .status("SUCCESS")
                .metadataSummary(summary)
                .build());
    }
}
