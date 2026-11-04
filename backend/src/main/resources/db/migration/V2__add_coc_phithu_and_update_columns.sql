-- ====================================================================
-- Script Migration Flyway V2: Thêm bảng Cọc, Phí thu và cập nhật cột
-- ====================================================================

-- 1. Bảng CỌC XEM PHÒNG (1 - 1 với LoaiPhongTro)
CREATE TABLE IF NOT EXISTS coc (
    ma_coc VARCHAR(50) PRIMARY KEY,
    ma_lpt VARCHAR(50) NOT NULL UNIQUE,
    so_tien_coc INT NOT NULL,
    CONSTRAINT fk_coc_loai_phong FOREIGN KEY (ma_lpt) REFERENCES loai_phong_tro (ma_lpt) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng PHÍ THU DỊCH VỤ (1 - 1 với Coc)
CREATE TABLE IF NOT EXISTS phi_thu (
    ma_phi_thu VARCHAR(50) PRIMARY KEY,
    ma_coc VARCHAR(50) NOT NULL UNIQUE,
    phi INT NOT NULL,
    CONSTRAINT fk_phithu_coc FOREIGN KEY (ma_coc) REFERENCES coc (ma_coc) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Đổi tên cột coc thành coc_phong trong bảng phong_tro
ALTER TABLE phong_tro CHANGE COLUMN coc coc_phong BIGINT DEFAULT 0;

-- 4. Cập nhật độ dài chuẩn CCCD (12 ký tự)
ALTER TABLE nguoi_dung MODIFY COLUMN cccd VARCHAR(12);
