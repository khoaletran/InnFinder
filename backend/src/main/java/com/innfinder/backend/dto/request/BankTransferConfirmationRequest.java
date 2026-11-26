package com.innfinder.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BankTransferConfirmationRequest {
    @Size(max = 100, message = "Mã tham chiếu ngân hàng tối đa 100 ký tự")
    @JsonAlias("maThamChieu")
    private String maThamChieuNganHang;
}
