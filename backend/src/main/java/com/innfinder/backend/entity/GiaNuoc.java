package com.innfinder.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.Min;
import lombok.*;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GiaNuoc {

    @Min(value = 0, message = "Giá nước phải lớn hơn hoặc bằng 0")
    @Column(name = "gia_nuoc_gia", nullable = false)
    @Builder.Default
    private Long gia = 0L;

    /**
     * false (0): tính theo số khối (m³)
     * true (1): tính theo người
     */
    @Column(name = "gia_nuoc_theo_nguoi", nullable = false)
    @Builder.Default
    private Boolean theoNguoi = false;
}
