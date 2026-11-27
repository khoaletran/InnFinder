package com.innfinder.backend.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserDetailResponseDTO {
    private UserResponseDTO user;
    private Long soDu;
    private List<BankAccountInfo> taiKhoanNganHang;
    private List<AdminTransactionResponseDTO> giaoDich;
    private List<AdminAppointmentResponseDTO> lichXemPhong;
    private List<RoomResponseDTO> phongChoThue;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BankAccountInfo {
        private Long id;
        private String soTaiKhoan;
        private String tenNganHang;
        private String tenChuTaiKhoan;
        private boolean macDinh;
    }
}
