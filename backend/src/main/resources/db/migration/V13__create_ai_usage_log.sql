-- V13: Tạo bảng ai_usage_log phục vụ AI Tracking & Giám sát sử dụng Gemini / Recommendation
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trace_id VARCHAR(36) NOT NULL,
    feature VARCHAR(40) NOT NULL,
    intent VARCHAR(32) NULL,
    search_mode VARCHAR(24) NULL,
    model VARCHAR(64) NOT NULL,
    is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    ma_nguoi_dung VARCHAR(14) NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    thought_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL,
    error_code VARCHAR(50) NULL,
    metadata_summary VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_usage_created_at (created_at),
    INDEX idx_ai_usage_feature_status (feature, status, created_at),
    INDEX idx_ai_usage_user (ma_nguoi_dung, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
