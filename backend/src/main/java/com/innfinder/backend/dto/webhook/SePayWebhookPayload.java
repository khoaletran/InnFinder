package com.innfinder.backend.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO tiếp nhận Webhook biến động số dư tài khoản ngân hàng từ SePay.vn
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SePayWebhookPayload {
    private Long id;
    private String gateway;
    private String transactionDate;
    private String accountNumber;
    private String subAccount;
    private String code;
    private String content;
    private String transferType; // "in" là tiền vào, "out" là tiền ra
    private Long transferAmount;
    private Long accumulated;
    private String referenceCode;
    private String description;
}
