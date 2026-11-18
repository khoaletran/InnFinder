ALTER TABLE tai_khoan_ngan_hang
    ADD COLUMN ten_chu_tai_khoan VARCHAR(100) NULL,
    ADD COLUMN mac_dinh BOOLEAN NOT NULL DEFAULT FALSE;

-- Chọn tài khoản đầu tiên làm mặc định cho dữ liệu hiện hữu.
UPDATE tai_khoan_ngan_hang bank
JOIN (SELECT ma_nguoi_dung, MIN(id) AS first_id FROM tai_khoan_ngan_hang GROUP BY ma_nguoi_dung) first_bank
    ON bank.id = first_bank.first_id
SET bank.mac_dinh = TRUE;

ALTER TABLE giao_dich
    ADD COLUMN ma_dat_lich VARCHAR(50) NULL,
    ADD COLUMN ma_tham_chieu_ngan_hang VARCHAR(100) NULL,
    ADD COLUMN ngan_hang_nhan VARCHAR(100) NULL,
    ADD COLUMN tai_khoan_nhan VARCHAR(50) NULL,
    ADD COLUMN ten_nguoi_nhan VARCHAR(100) NULL,
    ADD COLUMN coc_goc BIGINT NULL,
    ADD COLUMN phi_hoa_hong BIGINT NULL,
    ADD CONSTRAINT fk_giao_dich_dat_lich FOREIGN KEY (ma_dat_lich) REFERENCES phieu_dat_lich(ma_dat_lich);
