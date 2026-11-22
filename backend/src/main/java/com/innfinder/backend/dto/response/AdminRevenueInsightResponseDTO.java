package com.innfinder.backend.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminRevenueInsightResponseDTO {
    private String nguonPhanTich; // "AI" | "RULE_BASED"
    private String tongQuan;
    private String danhGiaDoanhThu;
    private String danhGiaNganKho;
    private String danhGiaLoaiPhong;
    private List<RecommendedActionDTO> deXuatQuyetDinh;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RecommendedActionDTO {
        private String tieuDe;
        private String moTa;
        private String mucDoUuTien; // "CAO" | "TRUNG_BINH" | "THEO_DOI"
        private String duongDan;
    }
}
