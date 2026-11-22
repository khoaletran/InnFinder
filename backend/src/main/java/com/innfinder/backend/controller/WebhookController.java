package com.innfinder.backend.controller;

import com.innfinder.backend.dto.webhook.SePayWebhookPayload;
import com.innfinder.backend.service.BankingWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhooks", description = "Endpoints tiếp nhận Webhook ngân hàng SePay thực tế")
public class WebhookController {

    private final BankingWebhookService bankingWebhookService;

    @PostMapping("/sepay")
    @Operation(summary = "Tiếp nhận webhook biến động số dư tự động từ SePay")
    public ResponseEntity<Map<String, Object>> handleSePayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody SePayWebhookPayload payload
    ) {
        Map<String, Object> result = bankingWebhookService.xuLySePayWebhook(authHeader, payload);
        return ResponseEntity.ok(result);
    }
}
