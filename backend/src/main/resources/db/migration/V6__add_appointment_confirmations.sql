-- V6: Bổ sung các trường xác nhận đặt lịch xem phòng: da_nhan_lai_coc, khach_hang_dong_y, chu_tro_dong_y
ALTER TABLE `phieu_dat_lich`
ADD COLUMN `da_nhan_lai_coc` BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN `khach_hang_dong_y` BOOLEAN DEFAULT NULL,
ADD COLUMN `chu_tro_dong_y` BOOLEAN DEFAULT NULL;
