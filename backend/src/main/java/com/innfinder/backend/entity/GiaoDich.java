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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_dat_lich")
    private PhieuDatLich phieuDatLich;

    @Column(name = "ma_tham_chieu_ngan_hang", length = 100)
    private String maThamChieuNganHang;
    @Column(name = "ngan_hang_nhan", length = 100)
    private String nganHangNhan;
    @Column(name = "tai_khoan_nhan", length = 50)
    private String taiKhoanNhan;
    @Column(name = "ten_nguoi_nhan", length = 100)
    private String tenNguoiNhan;
    @Column(name = "coc_goc")
    private Long cocGoc;
    @Column(name = "phi_hoa_hong")
    private Long phiHoaHong;

    @Column(name = "ngay_giao_dich", nullable = false)
    private LocalDateTime ngayGiaoDich;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    @Builder.Default
    private TrangThaiGD trangThai = TrangThaiGD.CHO_THANH_TOAN;
}
