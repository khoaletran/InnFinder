package com.innfinder.backend.controller;

import com.innfinder.backend.dto.webhook.CassoWebhookPayload;
import com.innfinder.backend.dto.webhook.SePayWebhookPayload;
import com.innfinder.backend.service.BankingWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhooks", description = "Endpoints tiếp nhận Webhook ngân hàng SePay & Casso thực tế")
public class WebhookController {

    private final BankingWebhookService bankingWebhookService;

    @Value("${sepay.enabled:false}")
    private boolean sepayEnabled;

    @Value("${casso.enabled:true}")
    private boolean cassoEnabled;

    @PostMapping("/sepay")
    @Operation(summary = "Tiếp nhận webhook biến động số dư tự động từ SePay")
    public ResponseEntity<Map<String, Object>> handleSePayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody SePayWebhookPayload payload
    ) {
        if (!sepayEnabled) {
            // Trả 204 No Content (không body) để đối tác không retry liên tục khi cổng đang tắt
            return ResponseEntity.noContent().build();
        }
        Map<String, Object> result = bankingWebhookService.xuLySePayWebhook(authHeader, payload);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/casso")
    @Operation(summary = "Tiếp nhận webhook biến động số dư tự động từ Casso")
    public ResponseEntity<Map<String, Object>> handleCassoWebhook(
            @RequestHeader(value = "secure-token", required = false) String secureToken,
            @RequestBody CassoWebhookPayload payload
    ) {
        if (!cassoEnabled) {
            // Trả 204 No Content (không body) để đối tác không retry liên tục khi cổng đang tắt
            return ResponseEntity.noContent().build();
        }
        Map<String, Object> result = bankingWebhookService.xuLyCassoWebhook(secureToken, payload);
        return ResponseEntity.ok(result);
    }
}
