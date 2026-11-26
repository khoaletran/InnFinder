package com.innfinder.backend.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO đại diện cho một bản ghi giao dịch trong danh sách data của Casso Webhook
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CassoTransactionItem {
    private Long id;                     // ID giao dịch duy nhất trên Casso
    private String tid;                  // Mã tham chiếu ngân hàng (ví dụ: FT24...)
    private String description;          // Nội dung chuyển khoản (chứa mã IFCOC... hoặc DL...)
    private Long amount;                 // Số tiền giao dịch
    private Long cusum_balance;          // Số dư lũy kế
    private String when;                 // Thời gian giao dịch (yyyy-MM-dd HH:mm:ss)
    private String subAccId;             // Số tài khoản nhận MB Bank
    private String bank_sub_acc_id;      // Alias số tài khoản nhận
    private String bankName;             // Tên ngân hàng (MB)
    private String bank_name;            // Tên ngân hàng alias
    private String corresponsiveName;    // Tên người chuyển
    private String corresponsiveAccount; // Số tài khoản người chuyển
    private String corresponsiveBankId;  // Mã ngân hàng người chuyển
    private String corresponsiveBankName;// Tên ngân hàng người chuyển
}
