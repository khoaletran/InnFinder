package com.innfinder.backend.service;

import com.innfinder.backend.dto.user.*;
import com.innfinder.backend.entity.TaiKhoanNganHang;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.TaiKhoanNganHangRepository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final NguoiDungRepository nguoiDungRepository;
    private final TaiKhoanNganHangRepository taiKhoanNganHangRepository;
    private final PasswordEncoder passwordEncoder;

    private NguoiDung getCurrentUser() {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    // 1. Lấy thông tin cá nhân
    public UserProfileResponse getMyProfile() {
        NguoiDung user = getCurrentUser();
        return UserProfileResponse.builder()
                .maNguoiDung(user.getMaNguoiDung())
                .tenDangNhap(user.getTenDangNhap())
                .email(user.getEmail())
                .sdt(user.getSdt())
                .cccd(user.getCccd())
                .hinhDaiDien(user.getHinhDaiDien())
                .vaiTro(user.getVaiTro())
                .chuTro(user.getChuTro())
                .thoiGianMoTaiKhoan(user.getThoiGianMoTaiKhoan())
                .build();
    }

    // 2. Cập nhật thông tin cá nhân
    @Transactional
    public UserProfileResponse updateProfile(UpdateProfileRequest request) {
        NguoiDung user = getCurrentUser();

        // Kiểm tra nếu đổi email mà email đó đã có người khác dùng
        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) &&
                nguoiDungRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        user.setEmail(request.getEmail());
        user.setSdt(request.getSdt());
        user.setHinhDaiDien(request.getHinhDaiDien());

        nguoiDungRepository.save(user);
        return getMyProfile();
    }

    // 3. Đổi mật khẩu
    @Transactional
    public String changePassword(ChangePasswordRequest request) {
        NguoiDung user = getCurrentUser();

        if (!passwordEncoder.matches(request.getMatKhauCu(), user.getMatKhau())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác!");
        }

        user.setMatKhau(passwordEncoder.encode(request.getMatKhauMoi()));
        nguoiDungRepository.save(user);
        return "Đổi mật khẩu thành công!";
    }

    // 4. Gửi yêu cầu Đăng ký làm Chủ trọ (Xác thực CCCD & Ngân hàng)
    @Transactional
    public String requestUpgradeToLandlord(LandlordUpgradeRequest request) {
        NguoiDung user = getCurrentUser();

        if (Boolean.TRUE.equals(user.getChuTro())) {
            throw new RuntimeException("Tài khoản của bạn đã là Chủ nhà trọ!");
        }

        user.setCccd(request.getCccd());
        nguoiDungRepository.save(user);

        TaiKhoanNganHang tknh = TaiKhoanNganHang.builder()
                .nguoiDung(user)
                .soTaiKhoan(request.getSoTaiKhoan())
                .tenNganHang(request.getTenNganHang())
                .build();
        taiKhoanNganHangRepository.save(tknh);

        return "Đã gửi hồ sơ đăng ký làm Chủ trọ thành công! Vui lòng chờ Admin kiểm duyệt.";
    }

    public java.util.List<BankAccountResponse> getMyBankAccounts() {
        NguoiDung user = getCurrentUser();
        return taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(user.getMaNguoiDung())
                .stream()
                .map(tk -> BankAccountResponse.builder()
                        .id(tk.getId())
                        .soTaiKhoan(tk.getSoTaiKhoan())
                        .tenNganHang(tk.getTenNganHang())
                        .build())
                .toList();
    }
}