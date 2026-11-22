package com.innfinder.backend.controller;

import com.innfinder.backend.dto.bank.BankLookupRequest;
import com.innfinder.backend.dto.bank.BankLookupResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.BankLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/banks")
@RequiredArgsConstructor
@Tag(name = "Bank Controller", description = "Các API Tra cứu & Xác thực tài khoản ngân hàng liên ngân hàng (NAPAS)")
@SecurityRequirement(name = "Bearer Authentication")
public class BankController {

    private final BankLookupService bankLookupService;

    @PostMapping("/lookup")
    @Operation(summary = "Tra cứu và xác thực tài khoản ngân hàng NAPAS 24/7")
    public ResponseEntity<ApiResponse<BankLookupResponse>> lookupAccount(@Valid @RequestBody BankLookupRequest request) {
        BankLookupResponse response = bankLookupService.lookupAccount(request);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getThongBao()));
    }
}
