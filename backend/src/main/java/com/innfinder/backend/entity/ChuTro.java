package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "chu_tro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChuTro {

    @Id
    @Column(name = "ma_chu_tro", length = 50)
    private String maChuTro;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "ma_chu_tro")
    private NguoiDung nguoiDung;

    @Column(name = "diem_uy_tin")
    @Builder.Default
    private Integer diemUyTin = 100;

    @Column(name = "so_du")
    @Builder.Default
    private Long soDu = 0L;

    @Column(name = "tam_an_den")
    private LocalDateTime tamAnDen;

    @OneToMany(mappedBy = "chuPhongTro", cascade = CascadeType.ALL)
    private List<PhongTro> dsPhongTro;

    @Transient
    public boolean isDangTamAn() {
        return tamAnDen != null && tamAnDen.isAfter(LocalDateTime.now());
    }
}
