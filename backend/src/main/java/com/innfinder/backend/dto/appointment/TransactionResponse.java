package com.innfinder.backend.dto.appointment;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {
    private String maGiaoDich;
    private Long soTien;
    private String loaiGiaoDich;
    private String noiDung;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime ngayGiaoDich;
    private TrangThaiGD trangThai;

    public static TransactionResponse fromEntity(GiaoDich entity) {
        if (entity == null) return null;
        return TransactionResponse.builder()
                .maGiaoDich(entity.getMaGiaoDich())
                .soTien(entity.getSoTien())
                .loaiGiaoDich(entity.getLoaiGiaoDich())
                .noiDung(entity.getNoiDung())
                .ngayGiaoDich(entity.getNgayGiaoDich())
                .trangThai(entity.getTrangThai())
                .build();
    }
}
