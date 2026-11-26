package com.innfinder.backend.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * DTO tiếp nhận Webhook biến động số dư tài khoản ngân hàng từ Casso.vn
 * Tự động hỗ trợ cả 2 dạng:
 * 1. data là Object đơn lẻ: { "id": 123, "amount": 200000, ... } (Casso Flow)
 * 2. data là Array danh sách: [ { "id": 123, ... } ] (Casso Webhook v1)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CassoWebhookPayload {
    private Integer error;
    private String messages;
    private Object data;

    /**
     * Trích xuất danh sách giao dịch chuẩn hóa bất kể Casso gửi data dạng Object hay Array
     */
    public List<CassoTransactionItem> getTransactions() {
        if (data == null) {
            return Collections.emptyList();
        }
        if (data instanceof List<?> list) {
            List<CassoTransactionItem> result = new ArrayList<>();
            for (Object obj : list) {
                if (obj instanceof Map<?, ?> map) {
                    result.add(fromMap(map));
                } else if (obj instanceof CassoTransactionItem item) {
                    result.add(item);
                }
            }
            return result;
        }
        if (data instanceof Map<?, ?> map) {
            return List.of(fromMap(map));
        }
        if (data instanceof CassoTransactionItem item) {
            return List.of(item);
        }
        return Collections.emptyList();
    }

    private static CassoTransactionItem fromMap(Map<?, ?> map) {
        Long id = null;
        Object rawId = map.get("id");
        if (rawId instanceof Number n) {
            id = n.longValue();
        } else if (rawId != null) {
            try {
                id = Long.parseLong(rawId.toString().trim());
            } catch (Exception ignored) {}
        }

        Long amount = null;
        Object rawAmount = map.get("amount");
        if (rawAmount instanceof Number n) {
            amount = n.longValue();
        } else if (rawAmount != null) {
            try {
                amount = Long.parseLong(rawAmount.toString().trim());
            } catch (Exception ignored) {}
        }

        String description = map.get("description") != null ? map.get("description").toString() : null;
        String tid = map.get("tid") != null ? map.get("tid").toString() : null;
        String when = map.get("when") != null ? map.get("when").toString() : null;

        String subAccId = null;
        if (map.get("subAccId") != null) {
            subAccId = map.get("subAccId").toString();
        } else if (map.get("bank_sub_acc_id") != null) {
            subAccId = map.get("bank_sub_acc_id").toString();
        }

        return CassoTransactionItem.builder()
                .id(id)
                .tid(tid)
                .description(description)
                .amount(amount)
                .when(when)
                .subAccId(subAccId)
                .build();
    }
}
