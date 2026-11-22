package com.innfinder.backend.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BankTransferConfirmationRequest {
    @Size(max = 100, message = "Mã tham chiếu ngân hàng tối đa 100 ký tự")
    private String maThamChieuNganHang;
}
