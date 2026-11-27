package com.innfinder.backend.dto.response;

import com.innfinder.backend.entity.LichSuDiemUyTin;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReputationHistoryResponseDTO {
    private Long id;
    private Integer bienDong;
    private Integer diemTruoc;
    private Integer diemSau;
    private String loaiSuKien;
    private String maThamChieu;
    private String lyDo;
    private LocalDateTime thoiGian;

    public static ReputationHistoryResponseDTO fromEntity(LichSuDiemUyTin entity) {
        if (entity == null) return null;
        return ReputationHistoryResponseDTO.builder()
                .id(entity.getId())
                .bienDong(entity.getBienDong())
                .diemTruoc(entity.getDiemTruoc())
                .diemSau(entity.getDiemSau())
                .loaiSuKien(entity.getLoaiSuKien())
                .maThamChieu(entity.getMaThamChieu())
                .lyDo(entity.getLyDo())
                .thoiGian(entity.getThoiGian())
                .build();
    }
}
