package com.innfinder.backend.dto.landlord;

import com.innfinder.backend.dto.response.ReputationHistoryResponseDTO;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandlordReputationSummaryDTO {
    private Integer diemUyTin;
    private String phanHang;
    private LocalDateTime tamAnDen;
    private boolean dangTamAn;
    private Integer gioiHanSoPhong;
    private boolean chanDangTinMoi;
    private List<ReputationHistoryResponseDTO> lichSu;
}
