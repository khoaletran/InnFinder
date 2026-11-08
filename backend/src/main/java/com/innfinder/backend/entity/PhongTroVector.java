package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "phong_tro_vector")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhongTroVector {

    @Id
    @Column(name = "ma_phong_tro", length = 50, nullable = false)
    private String maPhongTro;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Lob
    @Column(name = "embedding_json", columnDefinition = "MEDIUMTEXT", nullable = false)
    private String embeddingJson;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
