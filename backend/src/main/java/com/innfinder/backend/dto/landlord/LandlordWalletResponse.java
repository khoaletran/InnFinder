package com.innfinder.backend.dto.landlord;

import com.innfinder.backend.dto.user.BankAccountResponse;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LandlordWalletResponse {
    private Long soDu;
    private Integer diemUyTin;
    private List<BankAccountResponse> dsTaiKhoanNganHang;
    private Long tongDaThu;
    private Long tongDaRut;
}
