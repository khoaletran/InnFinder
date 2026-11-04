package com.innfinder.backend.entity;

import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "phong_tro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhongTro {

    @Id
    @Column(name = "ma_phong_tro", length = 50)
    private String maPhongTro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_chu_tro", nullable = false)
    private ChuTro chuPhongTro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_lpt", nullable = false)
    private LoaiPhongTro loaiPhong;

    @Column(name = "gia_thue", nullable = false)
    private Long giaThue;

    @Column(name = "dien_tich", nullable = false)
    private Integer dienTich;

    @Column(name = "mo_ta", columnDefinition = "TEXT")
    private String moTa;

    @Column(name = "so_nguoi", nullable = false)
    private Integer soNguoi;

    @Column(name = "thoi_gian_dang", nullable = false)
    private LocalDateTime thoiGianDang;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    @Builder.Default
    private TrangThaiPhongTro trangThai = TrangThaiPhongTro.CHO_DUYET;

    @Column(name = "dia_chi", nullable = false)
    private String diaChi;

    @Column(name = "kinh_do", length = 50)
    private String kinhDo;

    @Column(name = "vi_do", length = 50)
    private String viDo;

    @Column(name = "coc_phong")
    @Builder.Default
    private Long cocPhong = 0L;

    @OneToMany(mappedBy = "phongTro", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<HinhAnh> hinhAnh;

    @ManyToMany
    @JoinTable(
        name = "tien_ich_phong",
        joinColumns = @JoinColumn(name = "ma_phong_tro"),
        inverseJoinColumns = @JoinColumn(name = "ma_tien_ich")
    )
    private List<TienIch> dsTienIch;

    @OneToMany(mappedBy = "phongTro", cascade = CascadeType.ALL)
    private List<DanhGia> dsDanhGia;

    @OneToMany(mappedBy = "phongTro", cascade = CascadeType.ALL)
    private List<PhieuDatLich> dsPhieuDatLich;
}
