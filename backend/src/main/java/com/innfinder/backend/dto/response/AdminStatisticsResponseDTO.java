package com.innfinder.backend.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStatisticsResponseDTO {
    private long tongSoPhong;
    private long soPhongChoDuyet;
    private long soPhongDaDuyet;
    private long soPhongHoanThanh;
    private long soPhongHuy;
    private long tongNguoiDung;
    private long soKhachHang;
    private long soChuTro;
    private long tongDoanhThu;
}
