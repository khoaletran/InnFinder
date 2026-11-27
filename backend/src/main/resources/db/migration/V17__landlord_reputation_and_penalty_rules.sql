ALTER TABLE chu_tro
    ADD COLUMN IF NOT EXISTS tam_an_den DATETIME NULL;

CREATE TABLE IF NOT EXISTS lich_su_diem_uy_tin (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ma_chu_tro VARCHAR(50) NOT NULL,
    bien_dong INT NOT NULL,
    diem_truoc INT NOT NULL,
    diem_sau INT NOT NULL,
    loai_su_kien VARCHAR(50) NOT NULL,
    ma_tham_chieu VARCHAR(64) NULL,
    ly_do VARCHAR(500) NOT NULL,
    thoi_gian DATETIME NOT NULL,
    CONSTRAINT fk_lsdut_chu_tro FOREIGN KEY (ma_chu_tro) REFERENCES chu_tro(ma_chu_tro) ON DELETE CASCADE,
    INDEX idx_lsdut_landlord_time (ma_chu_tro, thoi_gian),
    INDEX idx_lsdut_landlord_event_time (ma_chu_tro, loai_su_kien, thoi_gian)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
