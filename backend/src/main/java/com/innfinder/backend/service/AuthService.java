package com.innfinder.backend.service;

import com.innfinder.backend.dto.auth.AuthResponse;
import com.innfinder.backend.dto.auth.LoginRequest;
import com.innfinder.backend.dto.auth.RegisterRequest;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.enums.VaiTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.security.JwtTokenProvider;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final NguoiDungRepository nguoiDungRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public String register(RegisterRequest request) {

        if (nguoiDungRepository.existsByTenDangNhap(request.getTenDangNhap())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        if (nguoiDungRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        String maNguoiDung = generateMaNguoiDung();

        NguoiDung nguoiDung = NguoiDung.builder()
                .maNguoiDung(maNguoiDung)
                .tenDangNhap(request.getTenDangNhap())
                .hoVaTen(request.getHoVaTen())
                .matKhau(passwordEncoder.encode(request.getMatKhau()))
                .email(request.getEmail())
                .sdt(request.getSdt())
                .cccd(null)
                .vaiTro(VaiTro.KHACH_HANG)
                .thoiGianMoTaiKhoan(LocalDate.now())
                .chuTro(false)
                .trangThaiKhoa(false)
                .build();

        nguoiDungRepository.save(nguoiDung);
        return "Đăng ký tài khoản thành công!";
    }

    /**
     * Sinh mã định danh người dùng chuẩn theo AGENTS.md:
     * Định dạng: ND + ddMMyyyy + 4 số thứ tự = đúng 14 ký tự
     * Regex: ^ND\d{8}\d{4}$
     */
    private synchronized String generateMaNguoiDung() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"));
        String prefix = "ND" + datePart;
        String maxId = nguoiDungRepository.findMaxMaNguoiDungByPrefix(prefix);

        int nextSequence = 1;
        if (maxId != null && maxId.length() == 14 && maxId.startsWith(prefix)) {
            try {
                String suffix = maxId.substring(10); // 4 ký tự cuối
                nextSequence = Integer.parseInt(suffix) + 1;
            } catch (NumberFormatException ignored) {
                nextSequence = 1;
            }
        }

        String candidate = String.format("%s%04d", prefix, nextSequence);
        while (nguoiDungRepository.existsById(candidate)) {
            nextSequence++;
            candidate = String.format("%s%04d", prefix, nextSequence);
        }
        return candidate;
    }

    public AuthResponse login(LoginRequest request){
        NguoiDung nguoiDung = nguoiDungRepository.findByTenDangNhap(request.getTenDangNhap())
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));

        if(Boolean.TRUE.equals(nguoiDung.getTrangThaiKhoa())) {
            throw new AppException(ErrorCode.ACCOUNT_LOCKED);
        }

        if(!passwordEncoder.matches(request.getMatKhau(), nguoiDung.getMatKhau())) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String token = jwtTokenProvider.generateToken(nguoiDung.getTenDangNhap(),
                nguoiDung.getVaiTro().name());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .maNguoiDung(nguoiDung.getMaNguoiDung())
                .tenDangNhap(nguoiDung.getTenDangNhap())
                .email(nguoiDung.getEmail())
                .sdt(nguoiDung.getSdt())
                .vaiTro(nguoiDung.getVaiTro())
                .chuTro(nguoiDung.isChuTro())
                .build();
    }
}
