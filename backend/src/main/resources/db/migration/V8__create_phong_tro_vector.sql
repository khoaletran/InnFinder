-- V8: Tạo bảng phong_tro_vector để lưu trữ Vector Embeddings phục vụ AI Semantic Search
CREATE TABLE IF NOT EXISTS phong_tro_vector (
    ma_phong_tro VARCHAR(50) PRIMARY KEY,
    content_hash VARCHAR(64) NULL,
    embedding_json MEDIUMTEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vector_phong_tro FOREIGN KEY (ma_phong_tro) REFERENCES phong_tro (ma_phong_tro) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
