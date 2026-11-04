package com.innfinder.backend.entity;

import com.innfinder.backend.entity.enums.MucDoViPham;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "phieu_khieu_nai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhieuKhieuNai {

    @Id
    @Column(name = "ma_khieu_nai", length = 50)
    private String maKhieuNai;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_nguoi_gui", nullable = false)
    private NguoiDung nguoiGui;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doi_tuong_khieu_nai", nullable = false)
    private NguoiDung doiTuongKhieuNai;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nguoi_duyet")
    private NguoiDung nguoiDuyet;

    @Column(name = "van_de", nullable = false)
    private String vanDe;

    @Column(name = "hinh_anh", length = 500)
    private String hinhAnh;

    @Column(name = "ngay_gui", nullable = false)
    private LocalDateTime ngayGui;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false)
    @Builder.Default
    private TrangThaiKhieuNai trangThai = TrangThaiKhieuNai.CHO_DUYET;

    @Column(name = "muc_do_uu_tien")
    @Builder.Default
    private Integer mucDoUuTien = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "muc_do_vi_pham", nullable = false)
    @Builder.Default
    private MucDoViPham mucDoViPham = MucDoViPham.NHE;
}
