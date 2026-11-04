package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tai_khoan_ngan_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaiKhoanNganHang {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_nguoi_dung", nullable = false)
    private NguoiDung nguoiDung;

    @Column(name = "so_tai_khoan", nullable = false, length = 50)
    private String soTaiKhoan;

    @Column(name = "ten_ngan_hang", nullable = false, length = 100)
    private String tenNganHang;
}
