package com.innfinder.backend.service;

import com.innfinder.backend.dto.landlord.WithdrawRequest;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.exception.*;
import com.innfinder.backend.repository.*;
import org.junit.jupiter.api.*;
import org.mockito.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WalletServiceTests {
    private final GiaoDichRepository transactions = mock(GiaoDichRepository.class);
    private final NguoiDungRepository users = mock(NguoiDungRepository.class);
    private final ChuTroRepository landlords = mock(ChuTroRepository.class);
    private final TaiKhoanNganHangRepository banks = mock(TaiKhoanNganHangRepository.class);
    private final TransactionService service = new TransactionService(transactions, users, landlords, banks);
    private final UserService userService = new UserService(users, banks, mock(YeuCauChuTroRepository.class), mock(PasswordEncoder.class));
    private NguoiDung owner;
    private TaiKhoanNganHang bank;
    private ChuTro wallet;

    @BeforeEach
    void setup() {
        owner = NguoiDung.builder().maNguoiDung("ND181120260001").tenDangNhap("owner").build();
        bank = TaiKhoanNganHang.builder().id(1L).nguoiDung(owner).tenNganHang("Vietcombank")
                .soTaiKhoan("123456789").tenChuTaiKhoan("NGUYEN VAN A").macDinh(true).build();
        wallet = ChuTro.builder().nguoiDung(owner).soDu(200000L).build();
        when(users.findByTenDangNhap("owner")).thenReturn(Optional.of(owner));
        when(users.findByIdForUpdate(owner.getMaNguoiDung())).thenReturn(Optional.of(owner));
        when(banks.findById(1L)).thenReturn(Optional.of(bank));
        when(landlords.findByIdForUpdate(owner.getMaNguoiDung())).thenReturn(Optional.of(wallet));
        when(transactions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("owner", "unused", List.of()));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    private WithdrawRequest request(long amount) { return WithdrawRequest.builder().soTien(amount).bankAccountId(1L).build(); }

    @Test void rejectsAnotherUsersBankWithoutDebitingWallet() {
        bank.setNguoiDung(NguoiDung.builder().maNguoiDung("other").build());
        AppException error = assertThrows(AppException.class, () -> service.taoYeuCauRutTien("owner", request(50000)));
        assertEquals(ErrorCode.BANK_ACCOUNT_NOT_OWNED, error.getErrorCode());
        assertEquals(200000L, wallet.getSoDu());
        verify(transactions, never()).save(any());
    }
    @Test void rejectsInsufficientFundsWithoutCreatingTransaction() {
        assertEquals(ErrorCode.INSUFFICIENT_BALANCE, assertThrows(AppException.class,
                () -> service.taoYeuCauRutTien("owner", request(250000))).getErrorCode());
        verify(transactions, never()).save(any());
        assertEquals(200000L, wallet.getSoDu());
    }
    @Test void reservesBalanceAndCopiesRecipientFromOwnedBank() {
        WithdrawRequest request = request(50000);
        request.setSoTaiKhoan("attacker");
        var receipt = service.taoYeuCauRutTien("owner", request);
        assertEquals(150000L, wallet.getSoDu());
        assertEquals(TrangThaiGD.CHO_THANH_TOAN, receipt.getTrangThai());
        assertEquals("123456789", receipt.getTaiKhoanNhan());
        assertEquals("NGUYEN VAN A", receipt.getTenNguoiNhan());
    }
    @Test void legacyClientMustStillUseLinkedBank() {
        when(banks.findByNguoiDung_MaNguoiDung(owner.getMaNguoiDung())).thenReturn(List.of(bank));
        WithdrawRequest request = WithdrawRequest.builder().soTien(50000L).soTaiKhoan("999999").tenNganHang("Vietcombank").build();
        assertEquals(ErrorCode.BANK_ACCOUNT_NOT_OWNED, assertThrows(AppException.class,
                () -> service.taoYeuCauRutTien("owner", request)).getErrorCode());
        assertEquals(200000L, wallet.getSoDu());
    }
    @Test void settingDefaultClearsOtherDefaultAndRejectsForeignAccount() {
        TaiKhoanNganHang second = TaiKhoanNganHang.builder().id(2L).nguoiDung(owner).build();
        when(banks.findById(2L)).thenReturn(Optional.of(second));
        when(banks.findByNguoiDung_MaNguoiDung(owner.getMaNguoiDung())).thenReturn(List.of(bank, second));
        userService.setDefaultBankAccount(2L);
        assertFalse(bank.isMacDinh());
        assertTrue(second.isMacDinh());
        second.setNguoiDung(NguoiDung.builder().maNguoiDung("other").build());
        assertEquals(ErrorCode.BANK_ACCOUNT_NOT_OWNED, assertThrows(AppException.class,
                () -> userService.setDefaultBankAccount(2L)).getErrorCode());
    }
    @Test void unlinkingDefaultPromotesRemainingAccount() {
        TaiKhoanNganHang second = TaiKhoanNganHang.builder().id(2L).nguoiDung(owner).build();
        when(banks.findByNguoiDung_MaNguoiDung(owner.getMaNguoiDung())).thenReturn(List.of(second));
        userService.deleteBankAccount(1L);
        verify(banks).delete(bank);
        assertTrue(second.isMacDinh());
    }
    @Test void receiptStoresCommissionWithoutDebitingWalletAgain() {
        var appointment = PhieuDatLich.builder().maDatLich("DL1").coc(200000L).phiThu(20000L).build();
        var transaction = service.taoGiaoDichLichHen(owner, 180000L, "CONG_TIEN_COC", "settlement", TrangThaiGD.THANH_CONG, appointment);
        assertEquals(180000L, transaction.getSoTien());
        assertEquals(200000L, transaction.getCocGoc());
        assertEquals(20000L, transaction.getPhiHoaHong());
        assertSame(appointment, transaction.getPhieuDatLich());
        assertEquals(200000L, wallet.getSoDu());
    }
    @Test void cancellationReceiptDoesNotChargeCommission() {
        var appointment = PhieuDatLich.builder().coc(200000L).phiThu(20000L).build();
        var transaction = service.taoGiaoDichLichHen(owner, 200000L, "HOAN_COC", "cancel", TrangThaiGD.THANH_CONG, appointment);
        assertEquals(0L, transaction.getPhiHoaHong());
        assertEquals(200000L, transaction.getSoTien());
    }
}
