package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_usage_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trace_id", nullable = false, length = 36)
    private String traceId;

    @Column(name = "feature", nullable = false, length = 40)
    private String feature;

    @Column(name = "intent", length = 32)
    private String intent;

    @Column(name = "search_mode", length = 24)
    private String searchMode;

    @Column(name = "model", nullable = false, length = 64)
    private String model;

    @Column(name = "is_fallback", nullable = false)
    @Builder.Default
    private boolean isFallback = false;

    @Column(name = "cache_hit", nullable = false)
    @Builder.Default
    private boolean cacheHit = false;

    @Column(name = "ma_nguoi_dung", length = 14)
    private String maNguoiDung;

    @Column(name = "prompt_tokens", nullable = false)
    @Builder.Default
    private int promptTokens = 0;

    @Column(name = "completion_tokens", nullable = false)
    @Builder.Default
    private int completionTokens = 0;

    @Column(name = "thought_tokens", nullable = false)
    @Builder.Default
    private int thoughtTokens = 0;

    @Column(name = "total_tokens", nullable = false)
    @Builder.Default
    private int totalTokens = 0;

    @Column(name = "latency_ms", nullable = false)
    @Builder.Default
    private long latencyMs = 0L;

    @Column(name = "status", nullable = false, length = 24)
    private String status;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "metadata_summary", length = 255)
    private String metadataSummary;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
