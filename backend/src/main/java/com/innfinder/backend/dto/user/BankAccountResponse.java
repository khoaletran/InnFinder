package com.innfinder.backend.dto.user;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankAccountResponse {
    private Long id;
    private String soTaiKhoan;
    private String tenNganHang;
    private String tenChuTaiKhoan;
    private boolean macDinh;

    public static BankAccountResponse fromEntity(com.innfinder.backend.entity.TaiKhoanNganHang bank) {
        return BankAccountResponse.builder().id(bank.getId()).soTaiKhoan(bank.getSoTaiKhoan())
                .tenNganHang(bank.getTenNganHang()).tenChuTaiKhoan(bank.getTenChuTaiKhoan())
                .macDinh(bank.isMacDinh()).build();
    }
}