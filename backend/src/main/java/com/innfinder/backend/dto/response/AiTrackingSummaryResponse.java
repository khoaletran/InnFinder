package com.innfinder.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiTrackingSummaryResponse {
    private int days;
    private long totalRequests;
    private long providerCalls;
    private long localBypassCalls;
    private double costSavingsPercent;

    private long successCount;
    private long errorCount;
    private long fallbackCount;
    private double successRatePercent;

    private long promptTokens;
    private long completionTokens;
    private long thoughtTokens;
    private long totalTokens;
    private boolean pricingConfigured;
    private double estimatedCostUsd;
    private long estimatedCostVnd;

    private long avgLatencyMs;
    private long p95LatencyMs;

    private QuotaStatus quotaStatus;
    private VectorHealth vectorHealth;
    private RecommendationStats recommendationStats;

    private List<DailyUsagePoint> dailyUsage;
    private List<FeatureUsagePoint> featureBreakdown;
    private List<IntentCount> intentBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuotaStatus {
        private long dailyTokensUsed;
        private long dailyTokenLimit;
        private long dailyCallsUsed;
        private double quotaUsagePercent;
        private boolean warning;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VectorHealth {
        private long totalApprovedRooms;
        private long indexedRooms;
        private double coveragePercent;
        private long semanticSearchCount;
        private long filteredFallbackCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendationStats {
        private long totalImpressions;
        private long totalClicks;
        private double ctrPercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyUsagePoint {
        private String date;
        private long providerCalls;
        private long localBypassCalls;
        private long totalTokens;
        private long errorCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeatureUsagePoint {
        private String feature;
        private long requests;
        private long totalTokens;
        private long avgLatencyMs;
        private long errorCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IntentCount {
        private String intent;
        private long count;
    }
}
