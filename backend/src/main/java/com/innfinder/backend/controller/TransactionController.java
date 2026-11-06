package com.innfinder.backend.controller;

import com.innfinder.backend.dto.appointment.TransactionResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.security.SecurityUtils;
import com.innfinder.backend.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@Tag(name = "Transaction", description = "APIs tra cứu biến động số dư và lịch sử giao dịch cọc")
public class TransactionController {

    private final TransactionService transactionService;

    private String getCurrentUsername() {
        return SecurityUtils.getCurrentUsername();
    }

    @GetMapping("/my-history")
    @Operation(summary = "Xem lịch sử giao dịch tiền cọc, hoàn tiền của tài khoản đang đăng nhập")
    public ApiResponse<List<TransactionResponse>> layLichSuGiaoDich() {
        String username = getCurrentUsername();
        List<TransactionResponse> response = transactionService.layLichSuGiaoDich(username);
        return ApiResponse.ok(response, "Lấy lịch sử giao dịch thành công");
    }
}