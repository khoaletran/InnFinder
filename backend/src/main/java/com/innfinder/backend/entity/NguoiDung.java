package com.innfinder.backend.entity;

import com.innfinder.backend.entity.enums.VaiTro;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "nguoi_dung")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NguoiDung {

    @Id
    @Column(name = "ma_nguoi_dung", length = 14)
    private String maNguoiDung;

    @Column(name = "ten_dang_nhap", unique = true, nullable = false, length = 50)
    private String tenDangNhap;

    @Column(name = "ho_va_ten", length = 100)
    private String hoVaTen;

    @Column(name = "mat_khau", nullable = false)
    private String matKhau;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 15)
    private String sdt;

    @Column(length = 12)
    private String cccd;

    @Enumerated(EnumType.STRING)
    @Column(name = "vai_tro", nullable = false)
    @Builder.Default
    private VaiTro vaiTro = VaiTro.KHACH_HANG;

    @Column(name = "hinh_dai_dien", length = 500)
    private String hinhDaiDien;

    @Column(name = "thoi_gian_mo_tai_khoan", nullable = false)
    private LocalDate thoiGianMoTaiKhoan;

    @Column(name = "chu_tro")
    @Builder.Default
    private Boolean chuTro = false;

    @Column(name = "trang_thai_khoa")
    @Builder.Default
    private Boolean trangThaiKhoa = false;

    @OneToOne(mappedBy = "nguoiDung", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private ChuTro thongTinChuTro;

    @OneToMany(mappedBy = "nguoiDung", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TaiKhoanNganHang> dsTaiKhoanNganHang;

    @OneToMany(mappedBy = "nguoiGui")
    private List<PhieuKhieuNai> dsKhieuNaiDaGui;

    @OneToMany(mappedBy = "nguoiDung")
    private List<DanhGia> dsDanhGia;

    @OneToMany(mappedBy = "nguoiDung")
    private List<GiaoDich> dsGiaoDich;

    @ManyToMany
    @JoinTable(
        name = "phong_yeu_thich",
        joinColumns = @JoinColumn(name = "ma_khach_hang"),
        inverseJoinColumns = @JoinColumn(name = "ma_phong_tro")
    )
    private List<PhongTro> dsPhongYeuThich;

    public Boolean isChuTro() {
        return Boolean.TRUE.equals(this.chuTro);
    }
}
