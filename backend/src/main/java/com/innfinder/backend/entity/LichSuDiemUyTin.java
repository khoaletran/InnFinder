package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lich_su_diem_uy_tin")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LichSuDiemUyTin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_chu_tro", nullable = false)
    private ChuTro chuTro;

    @Column(name = "bien_dong", nullable = false)
    private Integer bienDong;

    @Column(name = "diem_truoc", nullable = false)
    private Integer diemTruoc;

    @Column(name = "diem_sau", nullable = false)
    private Integer diemSau;

    @Column(name = "loai_su_kien", nullable = false, length = 50)
    private String loaiSuKien;

    @Column(name = "ma_tham_chieu", length = 64)
    private String maThamChieu;

    @Column(name = "ly_do", nullable = false, length = 500)
    private String lyDo;

    @Column(name = "thoi_gian", nullable = false)
    private LocalDateTime thoiGian;
}
