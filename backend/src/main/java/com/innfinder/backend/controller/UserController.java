package com.innfinder.backend.controller;

import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.dto.user.*;
import com.innfinder.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "2. User Controller", description = "Các API Quản lý tài khoản cá nhân và Hồ sơ người dùng")
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    @Operation(summary = "Xem thông tin cá nhân của người đang đăng nhập")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyProfile(), "Lấy thông tin thành công"));
    }

    @PutMapping("/profile")
    @Operation(summary = "Cập nhật thông tin cá nhân (Email, SĐT, Avatar)")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(request), "Cập nhật hồ sơ thành công"));
    }

    @PatchMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu tài khoản")
    public ResponseEntity<ApiResponse<String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.changePassword(request), "Đổi mật khẩu thành công"));
    }

    @PostMapping("/upgrade-to-landlord")
    @Operation(summary = "Gửi hồ sơ đăng ký làm Chủ trọ (Khai báo CCCD & Tài khoản ngân hàng)")
    public ResponseEntity<ApiResponse<String>> requestUpgradeToLandlord(@Valid @RequestBody LandlordUpgradeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.requestUpgradeToLandlord(request), "Gửi hồ sơ thành công"));
    }

    @GetMapping("/bank-accounts")
    @Operation(summary = "Xem danh sách tài khoản ngân hàng của tôi")
    public ResponseEntity<ApiResponse<List<BankAccountResponse>>> getMyBankAccounts() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyBankAccounts(), "Lấy danh sách ngân hàng thành công"));
    }
}