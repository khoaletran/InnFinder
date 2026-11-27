CREATE TABLE IF NOT EXISTS lich_su_bieu_phi (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ma_lpt VARCHAR(50) NOT NULL,
    ten_loai_phong VARCHAR(255) NOT NULL,
    coc_cu INT NOT NULL,
    coc_moi INT NOT NULL,
    phi_cu INT NOT NULL,
    phi_moi INT NOT NULL,
    ly_do VARCHAR(500) NOT NULL,
    nguoi_sua VARCHAR(150) NOT NULL,
    thoi_gian DATETIME NOT NULL,
    INDEX idx_lsbp_lpt_time (ma_lpt, thoi_gian),
    INDEX idx_lsbp_time (thoi_gian)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
