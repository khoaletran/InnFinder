package com.innfinder.backend.service;

import com.innfinder.backend.dto.user.*;
import com.innfinder.backend.entity.TaiKhoanNganHang;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.TaiKhoanNganHangRepository;
import com.innfinder.backend.dto.response.LandlordRequestResponseDTO;
import com.innfinder.backend.entity.YeuCauChuTro;
import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import com.innfinder.backend.entity.enums.VaiTro;
import com.innfinder.backend.repository.YeuCauChuTroRepository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final NguoiDungRepository nguoiDungRepository;
    private final TaiKhoanNganHangRepository taiKhoanNganHangRepository;
    private final YeuCauChuTroRepository yeuCauChuTroRepository;
    private final PasswordEncoder passwordEncoder;

    private NguoiDung getCurrentUser() {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private void requireCustomerRole(NguoiDung user) {
        if (user.getVaiTro() == VaiTro.QUAN_TRI) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    // 1. Lấy thông tin cá nhân
    public UserProfileResponse getMyProfile() {
        NguoiDung user = getCurrentUser();
        return UserProfileResponse.builder()
                .maNguoiDung(user.getMaNguoiDung())
                .tenDangNhap(user.getTenDangNhap())
                .hoVaTen(user.getHoVaTen())
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

        if (request.getHoVaTen() != null) {
            user.setHoVaTen(request.getHoVaTen().trim());
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
            throw new AppException(ErrorCode.INVALID_CURRENT_PASSWORD);
        }

        user.setMatKhau(passwordEncoder.encode(request.getMatKhauMoi()));
        nguoiDungRepository.save(user);

        return "Đổi mật khẩu thành công!";
    }

    @Transactional(readOnly = true)
    public List<BankAccountResponse> getMyBankAccounts() {
        NguoiDung user = getCurrentUser();
        requireCustomerRole(user);
        return taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(user.getMaNguoiDung())
                .stream().map(BankAccountResponse::fromEntity).toList();
    }

    private NguoiDung lockBankOwner() {
        NguoiDung user = getCurrentUser();
        requireCustomerRole(user);
        return nguoiDungRepository.findByIdForUpdate(user.getMaNguoiDung())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @Transactional
    public BankAccountResponse addBankAccount(CreateBankAccountRequest request) {
        NguoiDung user = lockBankOwner();
        List<TaiKhoanNganHang> accounts = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(user.getMaNguoiDung());
        if (accounts.stream().anyMatch(tk -> tk.getSoTaiKhoan().equals(request.getSoTaiKhoan())
                && tk.getTenNganHang().equalsIgnoreCase(request.getTenNganHang().trim()))) {
            throw new AppException(ErrorCode.BANK_ACCOUNT_EXISTED);
        }
        TaiKhoanNganHang bank = TaiKhoanNganHang.builder().nguoiDung(user)
                .soTaiKhoan(request.getSoTaiKhoan()).tenNganHang(request.getTenNganHang().trim())
                .tenChuTaiKhoan(request.getTenChuTaiKhoan() == null ? null : request.getTenChuTaiKhoan().trim())
                .macDinh(accounts.stream().noneMatch(TaiKhoanNganHang::isMacDinh)).build();
        return BankAccountResponse.fromEntity(taiKhoanNganHangRepository.save(bank));
    }

    private TaiKhoanNganHang ownedBank(Long id, NguoiDung user) {
        TaiKhoanNganHang bank = taiKhoanNganHangRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BANK_ACCOUNT_NOT_FOUND));
        if (!bank.getNguoiDung().getMaNguoiDung().equals(user.getMaNguoiDung())) {
            throw new AppException(ErrorCode.BANK_ACCOUNT_NOT_OWNED);
        }
        return bank;
    }

    @Transactional
    public void setDefaultBankAccount(Long id) {
        NguoiDung user = lockBankOwner();
        ownedBank(id, user);
        List<TaiKhoanNganHang> accounts = taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(user.getMaNguoiDung());
        accounts.forEach(bank -> bank.setMacDinh(bank.getId().equals(id)));
        taiKhoanNganHangRepository.saveAll(accounts);
    }

    @Transactional
    public void deleteBankAccount(Long id) {
        NguoiDung user = lockBankOwner();
        TaiKhoanNganHang bank = ownedBank(id, user);
        taiKhoanNganHangRepository.delete(bank);
        if (bank.isMacDinh()) {
            taiKhoanNganHangRepository.findByNguoiDung_MaNguoiDung(user.getMaNguoiDung()).stream()
                    .filter(other -> !other.getId().equals(id))
                    .min(java.util.Comparator.comparing(TaiKhoanNganHang::getId))
                    .ifPresent(other -> { other.setMacDinh(true); taiKhoanNganHangRepository.save(other); });
        }
    }

    // 5. Khách hàng nộp hồ sơ xin nâng cấp lên Chủ trọ
    @Transactional
    public String requestUpgradeToLandlord(LandlordUpgradeRequest request) {
        NguoiDung user = getCurrentUser();
        requireCustomerRole(user);

        if (Boolean.TRUE.equals(user.getChuTro())) {
            throw new AppException(ErrorCode.ALREADY_A_LANDLORD);
        }

        if (yeuCauChuTroRepository.existsByNguoiDung_MaNguoiDungAndTrangThai(
                user.getMaNguoiDung(), TrangThaiYeuCauChuTro.CHO_DUYET)) {
            throw new AppException(ErrorCode.LANDLORD_REQUEST_PENDING);
        }

        String maYeuCau = "YC" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("ddMMyyyyHHmmss"));

        YeuCauChuTro yeuCau = YeuCauChuTro.builder()
                .maYeuCau(maYeuCau)
                .nguoiDung(user)
                .cccd(request.getCccd())
                .anhCccdTruoc(request.getAnhCccdTruoc())
                .anhCccdSau(request.getAnhCccdSau())
                .tenNganHang(request.getTenNganHang())
                .soTaiKhoan(request.getSoTaiKhoan())
                .tenChuTaiKhoan(request.getTenChuTaiKhoan())
                .trangThai(TrangThaiYeuCauChuTro.CHO_DUYET)
                .ngayGui(LocalDateTime.now())
                .build();

        yeuCauChuTroRepository.save(yeuCau);

        return "Đã gửi hồ sơ lên Admin xét duyệt trở thành Chủ trọ thành công!";
    }

    // 6. Lấy hồ sơ đăng ký Chủ trọ gần nhất của người dùng
    public LandlordRequestResponseDTO getMyLandlordRequest() {
        NguoiDung user = getCurrentUser();
        requireCustomerRole(user);
        return yeuCauChuTroRepository.findTopByNguoiDung_MaNguoiDungOrderByNgayGuiDesc(user.getMaNguoiDung())
                .map(LandlordRequestResponseDTO::fromEntity)
                .orElse(null);
    }
}
