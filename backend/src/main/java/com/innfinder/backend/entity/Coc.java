package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "coc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Coc {

    @Id
    @Column(name = "ma_coc", length = 50)
    private String maCoc;

    @Column(name = "so_tien_coc", nullable = false)
    private Integer soTienCoc;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_lpt", nullable = false, unique = true)
    private LoaiPhongTro loaiPhong;

    @OneToOne(mappedBy = "coc", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private PhiThu phiThu;
}
