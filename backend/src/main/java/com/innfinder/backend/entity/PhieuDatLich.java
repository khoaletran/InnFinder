package com.innfinder.backend.entity;

import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "phieu_dat_lich")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhieuDatLich {

    @Id
    @Column(name = "ma_dat_lich", length = 50)
    private String maDatLich;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_khach_hang", nullable = false)
    private NguoiDung khachHang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_phong_tro", nullable = false)
    private PhongTro phongTro;

    @Column(name = "ngay_hen", nullable = false)
    private LocalDateTime ngayHen;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    @Builder.Default
    private TrangThaiDatLich trangThai = TrangThaiDatLich.CHO_XAC_NHAN;

    @Builder.Default
    private Long coc = 0L;

    @Column(name = "phi_thu")
    @Builder.Default
    private Long phiThu = 0L;

    @Column(name = "li_do_huy", columnDefinition = "TEXT")
    private String liDoHuy;
}
