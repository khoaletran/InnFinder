package com.innfinder.backend.entity;

import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "yeu_cau_chu_tro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YeuCauChuTro {

    @Id
    @Column(name = "ma_yeu_cau", length = 50)
    private String maYeuCau;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_nguoi_dung", nullable = false)
    private NguoiDung nguoiDung;

    @Column(name = "cccd", length = 12, nullable = false)
    private String cccd;

    @Column(name = "anh_cccd_truoc", length = 500, nullable = false)
    private String anhCccdTruoc;

    @Column(name = "anh_cccd_sau", length = 500, nullable = false)
    private String anhCccdSau;

    @Column(name = "ten_ngan_hang", length = 100, nullable = false)
    private String tenNganHang;

    @Column(name = "so_tai_khoan", length = 50, nullable = false)
    private String soTaiKhoan;

    @Column(name = "ten_chu_tai_khoan", length = 100, nullable = false)
    private String tenChuTaiKhoan;

    @Column(name = "ngay_gui", nullable = false)
    @Builder.Default
    private LocalDateTime ngayGui = LocalDateTime.now();

    @Column(name = "ngay_duyet")
    private LocalDateTime ngayDuyet;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    @Builder.Default
    private TrangThaiYeuCauChuTro trangThai = TrangThaiYeuCauChuTro.CHO_DUYET;

    @Column(name = "ly_do_tu_choi", columnDefinition = "TEXT")
    private String lyDoTuChoi;
}
