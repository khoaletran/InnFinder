package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "phi_thu")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhiThu {

    @Id
    @Column(name = "ma_phi_thu", length = 50)
    private String maPhiThu;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ma_coc", nullable = false, unique = true)
    private Coc coc;

    @Column(name = "phi", nullable = false)
    private Integer phi;
}
