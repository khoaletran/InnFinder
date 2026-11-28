package com.innfinder.backend.service;

import com.innfinder.backend.dto.response.AiTrackingSummaryResponse;
import com.innfinder.backend.dto.response.AiTrackingSummaryResponse.*;
import com.innfinder.backend.entity.AiUsageLog;
import com.innfinder.backend.repository.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiTrackingService {
    private final AiUsageLogRepository logRepository;
    private final PhongTroRepository phongTroRepository;
    private final PhongTroVectorRepository vectorRepository;
    @Autowired @Qualifier("aiTrackingExecutor") private Executor executor;
    @Autowired private NguoiDungRepository users;
    @Autowired private RoomDiscoveryService discovery;
    @Value("${gemini.daily-token-budget:500000}") private long dailyTokenBudget;
    // Format: model=inputUSD,outputUSD;model2=inputUSD,outputUSD per million tokens.
    @Value("${gemini.pricing-per-million:}") private String pricingPerMillion = "";
    @Value("${gemini.usd-vnd-rate:25400}") private double usdVndRate = 25400;
    private LocalDate observedDay;
    private long observedTokens;
    private final Map<String, Long> recentBehaviorEvents = new LinkedHashMap<>();

    public synchronized void recordRoomBehavior(String feature, String maPhongTro, String actor) {
        if (feature == null || maPhongTro == null || maPhongTro.isBlank()) return;
        long now = System.currentTimeMillis();
        recentBehaviorEvents.values().removeIf(ts -> now - ts > 60_000L);
        String key = feature + "|" + maPhongTro + "|" + (actor != null && !actor.isBlank() ? actor : "guest");
        if (recentBehaviorEvents.containsKey(key)) {
            return;
        }
        if (recentBehaviorEvents.size() >= 2000) {
            recentBehaviorEvents.remove(recentBehaviorEvents.keySet().iterator().next());
        }
        recentBehaviorEvents.put(key, now);
        recordAsync(AiUsageLog.builder()
                .traceId(UUID.randomUUID().toString())
                .feature(feature)
                .model("innfinder-tracker")
                .maNguoiDung(actor)
                .maPhongTro(maPhongTro)
                .status("SUCCESS")
                .metadataSummary("roomId=" + maPhongTro)
                .build());
    }

    public void recordAsync(AiUsageLog entry) {
        if (entry == null) return;
        try {
            String actor = entry.getMaNguoiDung();
            entry.setMaNguoiDung(actor == null ? null : users.findByTenDangNhap(actor).map(u -> u.getMaNguoiDung()).orElse(null));
            entry.setMetadataSummary(trim(entry.getMetadataSummary(), 255));
            entry.setSearchMode(trim(entry.getSearchMode(), 24));
            if (entry.getMaPhongTro() == null && entry.getMetadataSummary() != null
                    && entry.getMetadataSummary().startsWith("roomId=PT")) {
                entry.setMaPhongTro(trim(entry.getMetadataSummary().substring(7), 14));
            } else {
                entry.setMaPhongTro(trim(entry.getMaPhongTro(), 14));
            }
            if (entry.getCreatedAt() == null) entry.setCreatedAt(LocalDateTime.now());
            if (entry.getTraceId() == null) entry.setTraceId(UUID.randomUUID().toString());
            executor.execute(() -> {
                try { logRepository.save(entry); }
                catch (Exception ex) { log.warn("AI tracking write failed: {}", ex.getClass().getSimpleName()); }
            });
        } catch (Exception ex) { log.warn("AI tracking enqueue skipped: {}", ex.getClass().getSimpleName()); }
    }
    private static String trim(String value, int max) { return value == null ? null : value.substring(0, Math.min(value.length(), max)); }

    private void refreshObservedUsage() {
        LocalDate today = LocalDate.now();
        long persisted = Optional.ofNullable(logRepository.sumTokensSince(today.atStartOfDay())).orElse(0L);
        if (!today.equals(observedDay)) { observedDay = today; observedTokens = persisted; }
        else observedTokens = Math.max(observedTokens, persisted);
    }
    public synchronized void observeProviderTokens(int tokens) {
        try {
            if (!LocalDate.now().equals(observedDay)) refreshObservedUsage();
            observedTokens += Math.max(0, tokens);
        } catch (Exception ex) { log.warn("AI budget observation unavailable"); }
    }
    public synchronized boolean isDailyQuotaExceeded() {
        try { if (dailyTokenBudget <= 0) return false; refreshObservedUsage(); return observedTokens >= dailyTokenBudget; }
        catch (Exception ex) { log.warn("AI budget check unavailable"); return false; }
    }
    public static boolean isBehavioralFeature(String feature) {
        if (feature == null) return false;
        return feature.startsWith("RECOMMEND")
                || "ROOM_VIEW".equals(feature)
                || "TOUR_360_VIEW".equals(feature);
    }

    private static boolean providerLog(AiUsageLog entry) {
        return !entry.isCacheHit() && !isBehavioralFeature(entry.getFeature());
    }
    @Transactional(readOnly = true)
    public AiTrackingSummaryResponse getSummary(int days) {
        int safeDays = Math.clamp(days, 1, 90);
        LocalDate today = LocalDate.now();
        var logs = logRepository.findByCreatedAtAfterOrderByCreatedAtAsc(today.minusDays(safeDays - 1L).atStartOfDay());
        var providers = logs.stream().filter(AiTrackingService::providerLog).toList();
        long bypass = logs.stream().filter(AiUsageLog::isCacheHit).count();
        long successes = providers.stream().filter(l -> "SUCCESS".equals(l.getStatus())).count();
        long errors = providers.stream().filter(l -> "ERROR".equals(l.getStatus())).count();
        long prompt = providers.stream().mapToLong(AiUsageLog::getPromptTokens).sum();
        long completion = providers.stream().mapToLong(AiUsageLog::getCompletionTokens).sum();
        long thoughts = providers.stream().mapToLong(AiUsageLog::getThoughtTokens).sum();
        long tokens = providers.stream().mapToLong(AiUsageLog::getTotalTokens).sum();

        Map<String, double[]> prices = new HashMap<>();
        for (String item : pricingPerMillion.split(";")) {
            try {
                String[] pair = item.split("="), rates = pair[1].split(",");
                double input = Double.parseDouble(rates[0]), output = Double.parseDouble(rates[1]);
                if (Double.isFinite(input) && Double.isFinite(output) && input >= 0 && output >= 0)
                    prices.put(pair[0].trim(), new double[]{input, output});
            } catch (RuntimeException ignored) { }
        }
        boolean pricingConfigured = !providers.isEmpty() && providers.stream().allMatch(l -> prices.containsKey(l.getModel()));
        double usd = providers.stream().filter(l -> prices.containsKey(l.getModel())).mapToDouble(l -> {
            double[] rate = prices.get(l.getModel());
            return (l.getPromptTokens() * rate[0] + ((long) l.getCompletionTokens() + l.getThoughtTokens()) * rate[1]) / 1_000_000.0;
        }).sum();
        var latencies = providers.stream().map(AiUsageLog::getLatencyMs).filter(v -> v > 0).sorted().toList();
        long avgLatency = Math.round(latencies.stream().mapToLong(Long::longValue).average().orElse(0));
        long p95 = latencies.isEmpty() ? 0 : latencies.get(Math.max(0, (int) Math.ceil(latencies.size() * .95) - 1));
        long dailyTokens = Optional.ofNullable(logRepository.sumTokensSince(today.atStartOfDay())).orElse(0L);
        long dailyCalls = Optional.ofNullable(logRepository.countProviderCallsSince(today.atStartOfDay())).orElse(0L);
        double quota = dailyTokenBudget <= 0 ? 0 : round1(dailyTokens * 100.0 / dailyTokenBudget);

        var documents = discovery.find(new com.innfinder.backend.dto.room.RoomFilterRequest());
        var hashes = documents.stream().collect(Collectors.toMap(d -> d.summary().getMaPhongTro(), d -> AiSearchService.hash(d.text())));
        long indexed = 0;
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        for (var vector : vectorRepository.findAllById(new ArrayList<>(hashes.keySet()))) {
            try {
                List<Double> values = mapper.readValue(vector.getEmbeddingJson(), new com.fasterxml.jackson.core.type.TypeReference<List<Double>>() {});
                if (AiEmbeddingService.isValidVector(values) && Objects.equals(hashes.get(vector.getMaPhongTro()), vector.getContentHash())) indexed++;
            } catch (Exception ignored) { }
        }
        long impressions = logs.stream().filter(l -> "RECOMMEND_IMPRESSION".equals(l.getFeature())).count();
        long clicks = logs.stream().filter(l -> "RECOMMEND_CLICK".equals(l.getFeature())).count();
        var byDay = logs.stream().collect(Collectors.groupingBy(l -> l.getCreatedAt().toLocalDate()));
        List<DailyUsagePoint> daily = new ArrayList<>();
        for (int i = safeDays - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            var entries = byDay.getOrDefault(day, List.of());
            daily.add(DailyUsagePoint.builder().date(day.toString())
                .providerCalls(entries.stream().filter(AiTrackingService::providerLog).count())
                .localBypassCalls(entries.stream().filter(AiUsageLog::isCacheHit).count())
                .totalTokens(entries.stream().filter(AiTrackingService::providerLog).mapToLong(AiUsageLog::getTotalTokens).sum())
                .errorCount(entries.stream().filter(l -> providerLog(l) && "ERROR".equals(l.getStatus())).count()).build());
        }
        var features = logs.stream().collect(Collectors.groupingBy(AiUsageLog::getFeature)).entrySet().stream().map(e ->
            FeatureUsagePoint.builder().feature(e.getKey()).requests(e.getValue().size())
                .totalTokens(e.getValue().stream().mapToLong(AiUsageLog::getTotalTokens).sum())
                .avgLatencyMs(Math.round(e.getValue().stream().mapToLong(AiUsageLog::getLatencyMs).average().orElse(0)))
                .errorCount(e.getValue().stream().filter(l -> "ERROR".equals(l.getStatus())).count()).build())
            .sorted(Comparator.comparingLong(FeatureUsagePoint::getRequests).reversed()).toList();
        var intents = logs.stream().filter(l -> l.getIntent() != null && !l.getIntent().isBlank())
            .collect(Collectors.groupingBy(AiUsageLog::getIntent, Collectors.mapping(AiUsageLog::getTraceId, Collectors.toSet())))
            .entrySet().stream().map(e -> IntentCount.builder().intent(e.getKey()).count(e.getValue().size()).build())
            .sorted(Comparator.comparingLong(IntentCount::getCount).reversed()).toList();
        return AiTrackingSummaryResponse.builder().days(safeDays).totalRequests(logs.size())
            .providerCalls(providers.size()).localBypassCalls(bypass)
            .costSavingsPercent(providers.size() + bypass == 0 ? 0 : round1(bypass * 100.0 / (providers.size() + bypass)))
            .successCount(successes).errorCount(errors).fallbackCount(providers.stream().filter(AiUsageLog::isFallback).count())
            .successRatePercent(providers.isEmpty() ? 100 : round1(successes * 100.0 / providers.size()))
            .promptTokens(prompt).completionTokens(completion).thoughtTokens(thoughts).totalTokens(tokens)
            .pricingConfigured(pricingConfigured).estimatedCostUsd(Math.round(usd * 10000.0) / 10000.0).estimatedCostVnd(Math.round(usd * usdVndRate))
            .avgLatencyMs(avgLatency).p95LatencyMs(p95)
            .quotaStatus(QuotaStatus.builder().dailyTokensUsed(dailyTokens).dailyTokenLimit(dailyTokenBudget).dailyCallsUsed(dailyCalls).quotaUsagePercent(quota).warning(quota >= 80).build())
            .vectorHealth(VectorHealth.builder().totalApprovedRooms(documents.size()).indexedRooms(indexed)
                .coveragePercent(documents.isEmpty() ? 0 : round1(indexed * 100.0 / documents.size()))
                .semanticSearchCount(logs.stream().filter(l -> "SEMANTIC".equals(l.getSearchMode())).map(AiUsageLog::getTraceId).distinct().count())
                .filteredFallbackCount(logs.stream().filter(l -> "FILTERED".equals(l.getSearchMode())).map(AiUsageLog::getTraceId).distinct().count()).build())
            .recommendationStats(RecommendationStats.builder().totalImpressions(impressions).totalClicks(clicks).ctrPercent(impressions == 0 ? 0 : round1(clicks * 100.0 / impressions)).build())
            .dailyUsage(daily).featureBreakdown(features).intentBreakdown(intents).build();
    }

    private static double round1(double value) { return Math.round(value * 10.0) / 10.0; }
}
