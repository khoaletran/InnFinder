package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lich_su_bieu_phi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LichSuBieuPhi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_lpt", nullable = false, length = 50)
    private String maLpt;

    @Column(name = "ten_loai_phong", nullable = false, length = 255)
    private String tenLoaiPhong;

    @Column(name = "coc_cu", nullable = false)
    private Integer cocCu;

    @Column(name = "coc_moi", nullable = false)
    private Integer cocMoi;

    @Column(name = "phi_cu", nullable = false)
    private Integer phiCu;

    @Column(name = "phi_moi", nullable = false)
    private Integer phiMoi;

    @Column(name = "ly_do", nullable = false, length = 500)
    private String lyDo;

    @Column(name = "nguoi_sua", nullable = false, length = 150)
    private String nguoiSua;

    @Column(name = "thoi_gian", nullable = false)
    private LocalDateTime thoiGian;
}
