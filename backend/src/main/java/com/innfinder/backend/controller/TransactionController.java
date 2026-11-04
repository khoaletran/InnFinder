package com.innfinder.backend.controller;

import com.innfinder.backend.dto.appointment.TransactionResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
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

    private String getCurrentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping("/my-history")
    @Operation(summary = "Xem lịch sử giao dịch tiền cọc, hoàn tiền của tài khoản đang đăng nhập")
    public ApiResponse<List<TransactionResponse>> layLichSuGiaoDich() {
        String currentUserId = getCurrentUserId();
        List<TransactionResponse> response = transactionService.layLichSuGiaoDich(currentUserId);
        return ApiResponse.ok(response, "Lấy lịch sử giao dịch thành công");
    }
}