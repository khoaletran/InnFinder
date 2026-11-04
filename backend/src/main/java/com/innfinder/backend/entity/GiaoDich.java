package com.innfinder.backend.entity;

import com.innfinder.backend.entity.enums.TrangThaiGD;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "giao_dich")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GiaoDich {

    @Id
    @Column(name = "ma_giao_dich", length = 50)
    private String maGiaoDich;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_nguoi_dung", nullable = false)
    private NguoiDung nguoiDung;

    @Column(name = "so_tien", nullable = false)
    private Long soTien;

    @Column(name = "loai_giao_dich", length = 50)
    private String loaiGiaoDich;

    @Column(name = "noi_dung", columnDefinition = "TEXT")
    private String noiDung;

    @Column(name = "ngay_giao_dich", nullable = false)
    private LocalDateTime ngayGiaoDich;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    @Builder.Default
    private TrangThaiGD trangThai = TrangThaiGD.CHO_THANH_TOAN;
}
