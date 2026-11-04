package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hinh_anh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HinhAnh {

    @Id
    @Column(name = "ma_hinh_anh", length = 50)
    private String maHinhAnh;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_phong_tro", nullable = false)
    private PhongTro phongTro;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "thu_tu_anh")
    @Builder.Default
    private Integer thuTuAnh = 0;

    @Column(name = "la_dai_dien")
    @Builder.Default
    private Boolean laDaiDien = false;
}
