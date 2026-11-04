-- ====================================================================
-- Script Migration Flyway V1: Khởi tạo toàn bộ CSDL InnFinder
-- Hệ quản trị CSDL: MariaDB 11+
-- ====================================================================

-- 1. Bảng LOẠI PHÒNG TRỌ
CREATE TABLE IF NOT EXISTS loai_phong_tro (
    ma_lpt VARCHAR(50) PRIMARY KEY,
    ten_loai_phong_tro VARCHAR(100) NOT NULL,
    mo_ta TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng TIỆN ÍCH
CREATE TABLE IF NOT EXISTS tien_ich (
    ma_tien_ich VARCHAR(50) PRIMARY KEY,
    ten_tien_ich VARCHAR(100) NOT NULL,
    mo_ta TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng NGƯỜI DÙNG
CREATE TABLE IF NOT EXISTS nguoi_dung (
    ma_nguoi_dung VARCHAR(50) PRIMARY KEY,
    ten_dang_nhap VARCHAR(50) NOT NULL UNIQUE,
    mat_khau VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    sdt VARCHAR(15) NOT NULL,
    cccd VARCHAR(20),
    vai_tro ENUM('QUAN_TRI', 'KHACH_HANG') NOT NULL DEFAULT 'KHACH_HANG',
    hinh_dai_dien VARCHAR(500),
    thoi_gian_mo_tai_khoan DATE NOT NULL,
    chu_tro BOOLEAN DEFAULT FALSE,
    trang_thai_khoa BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng CHỦ TRỌ (1 - 0..1 với NguoiDung)
CREATE TABLE IF NOT EXISTS chu_tro (
    ma_chu_tro VARCHAR(50) PRIMARY KEY,
    diem_uy_tin INT DEFAULT 100,
    so_du BIGINT DEFAULT 0,
    CONSTRAINT fk_chutro_nguoidung FOREIGN KEY (ma_chu_tro) REFERENCES nguoi_dung (ma_nguoi_dung) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng TÀI KHOẢN NGÂN HÀNG
CREATE TABLE IF NOT EXISTS tai_khoan_ngan_hang (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ma_nguoi_dung VARCHAR(50) NOT NULL,
    so_tai_khoan VARCHAR(50) NOT NULL,
    ten_ngan_hang VARCHAR(100) NOT NULL,
    CONSTRAINT fk_tknh_nguoidung FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung (ma_nguoi_dung) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng PHÒNG TRỌ
CREATE TABLE IF NOT EXISTS phong_tro (
    ma_phong_tro VARCHAR(50) PRIMARY KEY,
    ma_chu_tro VARCHAR(50) NOT NULL,
    ma_lpt VARCHAR(50) NOT NULL,
    gia_thue BIGINT NOT NULL,
    dien_tich INT NOT NULL,
    mo_ta TEXT,
    so_nguoi INT NOT NULL,
    thoi_gian_dang DATETIME NOT NULL,
    trang_thai ENUM('HUY', 'CHO_DUYET', 'DA_DUYET', 'HOAN_THANH') NOT NULL DEFAULT 'CHO_DUYET',
    dia_chi VARCHAR(255) NOT NULL,
    kinh_do VARCHAR(50),
    vi_do VARCHAR(50),
    coc BIGINT DEFAULT 0,
    CONSTRAINT fk_phong_chutro FOREIGN KEY (ma_chu_tro) REFERENCES chu_tro (ma_chu_tro) ON DELETE CASCADE,
    CONSTRAINT fk_phong_loai FOREIGN KEY (ma_lpt) REFERENCES loai_phong_tro (ma_lpt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng HÌNH ẢNH
CREATE TABLE IF NOT EXISTS hinh_anh (
    ma_hinh_anh VARCHAR(50) PRIMARY KEY,
    ma_phong_tro VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    thu_tu_anh INT DEFAULT 0,
    la_dai_dien BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_hinhanh_phong FOREIGN KEY (ma_phong_tro) REFERENCES phong_tro (ma_phong_tro) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng TIỆN ÍCH PHÒNG (N - N giữa PhongTro và TienIch)
CREATE TABLE IF NOT EXISTS tien_ich_phong (
    ma_phong_tro VARCHAR(50) NOT NULL,
    ma_tien_ich VARCHAR(50) NOT NULL,
    PRIMARY KEY (ma_phong_tro, ma_tien_ich),
    CONSTRAINT fk_tip_phong FOREIGN KEY (ma_phong_tro) REFERENCES phong_tro (ma_phong_tro) ON DELETE CASCADE,
    CONSTRAINT fk_tip_tienich FOREIGN KEY (ma_tien_ich) REFERENCES tien_ich (ma_tien_ich) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng PHIẾU ĐẶT LỊCH (Lịch xem phòng)
CREATE TABLE IF NOT EXISTS phieu_dat_lich (
    ma_dat_lich VARCHAR(50) PRIMARY KEY,
    ma_khach_hang VARCHAR(50) NOT NULL,
    ma_phong_tro VARCHAR(50) NOT NULL,
    ngay_hen DATETIME NOT NULL,
    trang_thai ENUM('CHO_XAC_NHAN', 'HUY', 'XAC_NHAN', 'HOAN_THANH') NOT NULL DEFAULT 'CHO_XAC_NHAN',
    coc BIGINT DEFAULT 0,
    phi_thu BIGINT DEFAULT 0,
    li_do_huy TEXT,
    CONSTRAINT fk_datlich_khach FOREIGN KEY (ma_khach_hang) REFERENCES nguoi_dung (ma_nguoi_dung),
    CONSTRAINT fk_datlich_phong FOREIGN KEY (ma_phong_tro) REFERENCES phong_tro (ma_phong_tro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng ĐÁNH GIÁ (Review)
CREATE TABLE IF NOT EXISTS danh_gia (
    ma_danh_gia VARCHAR(50) PRIMARY KEY,
    ma_nguoi_dung VARCHAR(50) NOT NULL,
    ma_phong_tro VARCHAR(50) NOT NULL,
    diem INT NOT NULL,
    noi_dung TEXT,
    ngay_danh_gia DATETIME NOT NULL,
    CONSTRAINT fk_danhgia_nguoidung FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung (ma_nguoi_dung),
    CONSTRAINT fk_danhgia_phong FOREIGN KEY (ma_phong_tro) REFERENCES phong_tro (ma_phong_tro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bảng PHÒNG YÊU THÍCH (Favorites)
CREATE TABLE IF NOT EXISTS phong_yeu_thich (
    ma_khach_hang VARCHAR(50) NOT NULL,
    ma_phong_tro VARCHAR(50) NOT NULL,
    PRIMARY KEY (ma_khach_hang, ma_phong_tro),
    CONSTRAINT fk_pyt_khach FOREIGN KEY (ma_khach_hang) REFERENCES nguoi_dung (ma_nguoi_dung) ON DELETE CASCADE,
    CONSTRAINT fk_pyt_phong FOREIGN KEY (ma_phong_tro) REFERENCES phong_tro (ma_phong_tro) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bảng PHIẾU KHIẾU NẠI
CREATE TABLE IF NOT EXISTS phieu_khieu_nai (
    ma_khieu_nai VARCHAR(50) PRIMARY KEY,
    ma_nguoi_gui VARCHAR(50) NOT NULL,
    doi_tuong_khieu_nai VARCHAR(50) NOT NULL,
    nguoi_duyet VARCHAR(50),
    van_de VARCHAR(255) NOT NULL,
    hinh_anh VARCHAR(500),
    ngay_gui DATETIME NOT NULL,
    trang_thai ENUM('CHO_DUYET', 'DANG_XU_LY', 'DA_XU_LI') NOT NULL DEFAULT 'CHO_DUYET',
    muc_do_uu_tien INT DEFAULT 1,
    muc_do_vi_pham ENUM('NHE', 'TRUNG_BINH', 'NANG') NOT NULL DEFAULT 'NHE',
    CONSTRAINT fk_kn_nguoigui FOREIGN KEY (ma_nguoi_gui) REFERENCES nguoi_dung (ma_nguoi_dung),
    CONSTRAINT fk_kn_doituong FOREIGN KEY (doi_tuong_khieu_nai) REFERENCES nguoi_dung (ma_nguoi_dung),
    CONSTRAINT fk_kn_nguoiduyet FOREIGN KEY (nguoi_duyet) REFERENCES nguoi_dung (ma_nguoi_dung)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bảng GIAO DỊCH
CREATE TABLE IF NOT EXISTS giao_dich (
    ma_giao_dich VARCHAR(50) PRIMARY KEY,
    ma_nguoi_dung VARCHAR(50) NOT NULL,
    so_tien BIGINT NOT NULL,
    loai_giao_dich VARCHAR(50),
    noi_dung TEXT,
    ngay_giao_dich DATETIME NOT NULL,
    trang_thai ENUM('CHO_THANH_TOAN', 'THANH_CONG', 'THAT_BAI', 'HOAN_TIEN') NOT NULL DEFAULT 'CHO_THANH_TOAN',
    CONSTRAINT fk_gd_nguoidung FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung (ma_nguoi_dung)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
