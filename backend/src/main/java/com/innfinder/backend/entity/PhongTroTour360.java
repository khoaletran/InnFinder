package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "phong_tro_tour_360")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhongTroTour360 {

    @Id
    @Column(name = "ma_tour", length = 50)
    private String maTour;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_phong_tro")
    private PhongTro phongTro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_chu_tro", nullable = false)
    private ChuTro chuTro;

    @Column(name = "start_node_id", length = 64)
    private String startNodeId;

    @Column(name = "tour_config_json", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String tourConfigJson;

    @Column(name = "node_count", nullable = false)
    @Builder.Default
    private Integer nodeCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
