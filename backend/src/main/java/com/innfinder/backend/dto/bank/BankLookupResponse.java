package com.innfinder.backend.dto.bank;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankLookupResponse {
    private String bin;
    private String soTaiKhoan;
    private String tenChuTaiKhoan;
    private boolean hopLe;
    private String thongBao;
}
