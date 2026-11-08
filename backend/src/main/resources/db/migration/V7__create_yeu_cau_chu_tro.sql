-- V7: Tạo bảng yeu_cau_chu_tro để quản lý hồ sơ đăng ký/nâng cấp lên Chủ trọ
CREATE TABLE IF NOT EXISTS yeu_cau_chu_tro (
    ma_yeu_cau VARCHAR(50) PRIMARY KEY,
    ma_nguoi_dung VARCHAR(50) NOT NULL,
    cccd VARCHAR(12) NOT NULL,
    anh_cccd_truoc VARCHAR(500) NOT NULL,
    anh_cccd_sau VARCHAR(500) NOT NULL,
    ten_ngan_hang VARCHAR(100) NOT NULL,
    so_tai_khoan VARCHAR(50) NOT NULL,
    ten_chu_tai_khoan VARCHAR(100) NOT NULL,
    ngay_gui DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_duyet DATETIME NULL,
    trang_thai ENUM('CHO_DUYET', 'DA_DUYET', 'TU_CHOI') NOT NULL DEFAULT 'CHO_DUYET',
    ly_do_tu_choi TEXT NULL,
    CONSTRAINT fk_yeucau_nguoidung FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung (ma_nguoi_dung)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
