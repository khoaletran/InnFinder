package com.innfinder.backend.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomTypeDepositFeeResponseDTO {
    private String maLpt;
    private String tenLoaiPhongTro;
    private String moTa;
    private String maCoc;
    private Integer soTienCoc;
    private String maPhiThu;
    private Integer phiThu;
    private Integer thucNhanChuTro;
    private Double tyLePhiPercent;
}
