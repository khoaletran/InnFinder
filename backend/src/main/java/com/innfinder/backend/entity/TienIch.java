package com.innfinder.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "tien_ich")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TienIch {

    @Id
    @Column(name = "ma_tien_ich", length = 50)
    private String maTienIch;

    @Column(name = "ten_tien_ich", nullable = false, length = 100)
    private String tenTienIch;

    @Column(name = "mo_ta", columnDefinition = "TEXT")
    private String moTa;

    @ManyToMany(mappedBy = "dsTienIch")
    private List<PhongTro> dsPhongTro;
}
