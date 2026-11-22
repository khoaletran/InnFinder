-- ==============================================================================
-- INNFINDER MIGRATION V11: BỔ SUNG TÊN CHỦ TÀI KHOẢN NGÂN HÀNG
-- 1. Thêm cột ten_chu_tai_khoan vào bảng tai_khoan_ngan_hang
-- 2. Đảm bảo loại bỏ cột ma_bin dư thừa (mã BIN được quản lý động ở tầng ứng dụng)
-- ==============================================================================

ALTER TABLE `tai_khoan_ngan_hang` 
ADD COLUMN IF NOT EXISTS `ten_chu_tai_khoan` VARCHAR(100) NULL AFTER `ten_ngan_hang`;

ALTER TABLE `tai_khoan_ngan_hang` 
DROP COLUMN IF EXISTS `ma_bin`;
