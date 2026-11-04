package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "loai_phong_tro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoaiPhongTro {

    @Id
    @Column(name = "ma_lpt", length = 50)
    private String maLpt;

    @Column(name = "ten_loai_phong_tro", nullable = false, length = 100)
    private String tenLoaiPhongTro;

    @Column(name = "mo_ta", columnDefinition = "TEXT")
    private String moTa;

    @OneToMany(mappedBy = "loaiPhong")
    private List<PhongTro> dsPhongTro;

    @OneToOne(mappedBy = "loaiPhong", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Coc coc;
}
