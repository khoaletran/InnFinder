package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.LichSuBieuPhi;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepositFeeHistoryResponseDTO {
    private Long id;
    private String maLpt;
    private String tenLoaiPhong;
    private Integer cocCu;
    private Integer cocMoi;
    private Integer phiCu;
    private Integer phiMoi;
    private String lyDo;
    private String nguoiSua;
    private LocalDateTime thoiGian;

    public static DepositFeeHistoryResponseDTO fromEntity(LichSuBieuPhi entity) {
        if (entity == null) return null;
        return DepositFeeHistoryResponseDTO.builder()
                .id(entity.getId())
                .maLpt(entity.getMaLpt())
                .tenLoaiPhong(entity.getTenLoaiPhong())
                .cocCu(entity.getCocCu())
                .cocMoi(entity.getCocMoi())
                .phiCu(entity.getPhiCu())
                .phiMoi(entity.getPhiMoi())
                .lyDo(entity.getLyDo())
                .nguoiSua(entity.getNguoiSua())
                .thoiGian(entity.getThoiGian())
                .build();
    }
}
