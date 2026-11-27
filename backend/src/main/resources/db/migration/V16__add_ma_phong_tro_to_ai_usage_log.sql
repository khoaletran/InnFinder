-- V16: Bổ sung cột ma_phong_tro và index cho bảng ai_usage_log để phục vụ thống kê phễu cấp phòng (Admin & Chủ trọ)
ALTER TABLE ai_usage_log
    ADD COLUMN IF NOT EXISTS ma_phong_tro VARCHAR(14) NULL AFTER ma_nguoi_dung;

UPDATE ai_usage_log
SET ma_phong_tro = SUBSTRING(metadata_summary, 8, 14)
WHERE ma_phong_tro IS NULL
  AND metadata_summary LIKE 'roomId=PT%';

CREATE INDEX IF NOT EXISTS idx_ai_usage_room_feature_created
    ON ai_usage_log (ma_phong_tro, feature, created_at);
