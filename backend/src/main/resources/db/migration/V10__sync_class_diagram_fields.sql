-- ==============================================================================
-- INNFINDER MIGRATION V10: ĐỒNG BỘ THUỘC TÍNH VỚI CLASS DIAGRAM CHUẨN
-- 1. Bổ sung thoi_gian_dat cho phieu_dat_lich
-- 2. Bổ sung ket_qua cho phieu_khieu_nai
-- ==============================================================================

-- 1. Bổ sung trường thời gian đặt lịch vào bảng phieu_dat_lich
ALTER TABLE `phieu_dat_lich` 
ADD COLUMN IF NOT EXISTS `thoi_gian_dat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Cập nhật dữ liệu cũ nếu thoi_gian_dat bị null (đặt bằng ngay_hen)
UPDATE `phieu_dat_lich` 
SET `thoi_gian_dat` = `ngay_hen` 
WHERE `thoi_gian_dat` IS NULL;

-- 2. Bổ sung trường kết quả xử lý của Admin vào bảng phieu_khieu_nai
ALTER TABLE `phieu_khieu_nai` 
ADD COLUMN IF NOT EXISTS `ket_qua` TEXT DEFAULT NULL;
