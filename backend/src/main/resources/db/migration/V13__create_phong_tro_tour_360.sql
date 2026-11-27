-- V13: Tạo bảng hạ tầng phụ trợ phong_tro_tour_360 phục vụ Tour tham quan phòng 360° đa điểm
CREATE TABLE IF NOT EXISTS phong_tro_tour_360 (
    ma_tour VARCHAR(50) PRIMARY KEY,
    ma_phong_tro VARCHAR(50) NULL,
    ma_chu_tro VARCHAR(50) NOT NULL,
    start_node_id VARCHAR(64) NULL,
    tour_config_json MEDIUMTEXT NOT NULL,
    node_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tour360_phong_tro (ma_phong_tro),
    INDEX idx_tour360_chu_tro (ma_chu_tro),
    CONSTRAINT fk_tour360_phong_tro FOREIGN KEY (ma_phong_tro) REFERENCES phong_tro (ma_phong_tro) ON DELETE SET NULL,
    CONSTRAINT fk_tour360_chu_tro FOREIGN KEY (ma_chu_tro) REFERENCES chu_tro (ma_chu_tro) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
