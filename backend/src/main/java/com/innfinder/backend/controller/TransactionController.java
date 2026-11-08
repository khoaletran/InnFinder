package com.innfinder.backend.controller;

import com.innfinder.backend.dto.appointment.TransactionResponse;
import com.innfinder.backend.dto.landlord.LandlordWalletResponse;
import com.innfinder.backend.dto.landlord.WithdrawRequest;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.security.SecurityUtils;
import com.innfinder.backend.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Transaction & Wallet", description = "APIs tra cứu biến động số dư, quản lý ví và rút tiền")
public class TransactionController {

    private final TransactionService transactionService;

    private String getCurrentUsername() {
        return SecurityUtils.getCurrentUsername();
    }

    @GetMapping("/api/transactions/my-history")
    @Operation(summary = "Xem lịch sử giao dịch tiền cọc, hoàn tiền của tài khoản đang đăng nhập")
    public ApiResponse<List<TransactionResponse>> layLichSuGiaoDich() {
        String username = getCurrentUsername();
        List<TransactionResponse> response = transactionService.layLichSuGiaoDich(username);
        return ApiResponse.ok(response, "Lấy lịch sử giao dịch thành công");
    }

    @GetMapping("/api/landlord/wallet")
    @Operation(summary = "Lấy thông tin ví của chủ trọ (Số dư, điểm uy tín, danh sách ngân hàng)")
    public ApiResponse<LandlordWalletResponse> getLandlordWallet() {
        String username = getCurrentUsername();
        LandlordWalletResponse response = transactionService.getLandlordWalletInfo(username);
        return ApiResponse.ok(response, "Lấy thông tin ví chủ trọ thành công");
    }

    @PostMapping("/api/landlord/wallet/withdraw")
    @Operation(summary = "Chủ trọ tạo yêu cầu rút tiền về tài khoản ngân hàng")
    public ApiResponse<TransactionResponse> taoYeuCauRutTien(@Valid @RequestBody WithdrawRequest request) {
        String username = getCurrentUsername();
        TransactionResponse response = transactionService.taoYeuCauRutTien(username, request);
        return ApiResponse.ok(response, "Tạo yêu cầu rút tiền thành công");
    }
}
