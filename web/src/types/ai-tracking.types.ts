export interface AiUsageLogItem {
  id: number;
  traceId: string;
  feature: string;
  intent: string | null;
  searchMode: string | null;
  model: string;
  isFallback: boolean;
  cacheHit: boolean;
  maNguoiDung: string | null;
  promptTokens: number;
  completionTokens: number;
  thoughtTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: string;
  errorCode: string | null;
  metadataSummary: string | null;
  createdAt: string;
}

export interface AiQuotaStatus {
  dailyTokensUsed: number;
  dailyTokenLimit: number;
  dailyCallsUsed: number;
  quotaUsagePercent: number;
  warning: boolean;
}

export interface AiVectorHealth {
  totalApprovedRooms: number;
  indexedRooms: number;
  coveragePercent: number;
  semanticSearchCount: number;
  filteredFallbackCount: number;
}

export interface AiRecommendationStats {
  totalImpressions: number;
  totalClicks: number;
  ctrPercent: number;
}

export interface AiDailyUsagePoint {
  date: string;
  providerCalls: number;
  localBypassCalls: number;
  totalTokens: number;
  errorCount: number;
}

export interface AiFeatureUsagePoint {
  feature: string;
  requests: number;
  totalTokens: number;
  avgLatencyMs: number;
  errorCount: number;
}

export interface AiIntentCount {
  intent: string;
  count: number;
}

export interface AiTrackingSummary {
  days: number;
  totalRequests: number;
  providerCalls: number;
  localBypassCalls: number;
  costSavingsPercent: number;
  successCount: number;
  errorCount: number;
  fallbackCount: number;
  successRatePercent: number;
  promptTokens: number;
  completionTokens: number;
  thoughtTokens: number;
  totalTokens: number;
  pricingConfigured: boolean;
  estimatedCostUsd: number;
  estimatedCostVnd: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  quotaStatus: AiQuotaStatus;
  vectorHealth: AiVectorHealth;
  recommendationStats: AiRecommendationStats;
  dailyUsage: AiDailyUsagePoint[];
  featureBreakdown: AiFeatureUsagePoint[];
  intentBreakdown: AiIntentCount[];
}

export interface AiUsageLogPage {
  content: AiUsageLogItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
