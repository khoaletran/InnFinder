package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.ConfirmReceivedDepositRequest;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceDepositLocationTest {

    @Mock private PhieuDatLichRepository phieuDatLichRepository;
    @Mock private NguoiDungRepository nguoiDungRepository;
    @Mock private PhongTroRepository phongTroRepository;
    @Mock private ChuTroRepository chuTroRepository;
    @Mock private TransactionService transactionService;
    @Mock private GiaoDichRepository giaoDichRepository;
    @Mock private TaiKhoanNganHangRepository taiKhoanNganHangRepository;

    private AppointmentService appointmentService;
    private NguoiDung khachHang;
    private PhongTro phongTro;
    private PhieuDatLich phieu;

    @BeforeEach
    void setUp() {
        appointmentService = new AppointmentService(
                phieuDatLichRepository,
                nguoiDungRepository,
                phongTroRepository,
                chuTroRepository,
                transactionService,
                giaoDichRepository,
                taiKhoanNganHangRepository
        );

        khachHang = new NguoiDung();
        khachHang.setMaNguoiDung("ND202611270001");
        khachHang.setTenDangNhap("khach_hang");

        phongTro = new PhongTro();
        phongTro.setMaPhongTro("PT271126000001");
        phongTro.setViDo("10.776900");
        phongTro.setKinhDo("106.700900");

        phieu = new PhieuDatLich();
        phieu.setMaDatLich("DL20261127001");
        phieu.setKhachHang(khachHang);
        phieu.setPhongTro(phongTro);
        phieu.setTrangThai(TrangThaiDatLich.XAC_NHAN);
        phieu.setDaNhanLaiCoc(false);
        phieu.setCoc(200_000L);
    }

    @Test
    @DisplayName("Đứng cách phòng trọ ~20m (<= 50m) -> Xác nhận nhận lại cọc thành công")
    void confirmReceivedDeposit_Within50Meters_Succeeds() {
        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));
        when(giaoDichRepository.existsDepositByMaDatLich(khachHang.getMaNguoiDung(), phieu.getMaDatLich())).thenReturn(true);
        when(phieuDatLichRepository.save(any(PhieuDatLich.class))).thenAnswer(i -> i.getArgument(0));

        // ~20m north of 10.776900
        ConfirmReceivedDepositRequest req = new ConfirmReceivedDepositRequest(10.777080, 106.700900);
        var res = appointmentService.khachHangXacNhanDaNhanCoc(phieu.getMaDatLich(), "khach_hang", req);

        assertTrue(res.getDaNhanLaiCoc());
        assertEquals(10.776900, res.getViDoPhong());
        assertEquals(106.700900, res.getKinhDoPhong());
    }

    @Test
    @DisplayName("Đứng cách phòng trọ ~110m (> 50m) -> Bị chặn với OUTSIDE_ALLOWED_RADIUS")
    void confirmReceivedDeposit_Outside50Meters_ThrowsException() {
        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));

        // ~111m north of 10.776900
        ConfirmReceivedDepositRequest req = new ConfirmReceivedDepositRequest(10.777900, 106.700900);
        AppException ex = assertThrows(
                AppException.class,
                () -> appointmentService.khachHangXacNhanDaNhanCoc(phieu.getMaDatLich(), "khach_hang", req)
        );

        assertEquals(ErrorCode.OUTSIDE_ALLOWED_RADIUS, ex.getErrorCode());
    }

    @Test
    @DisplayName("Phòng trọ chưa có tọa độ -> Bị chặn với ROOM_LOCATION_MISSING")
    void confirmReceivedDeposit_MissingRoomCoordinates_ThrowsException() {
        phongTro.setViDo(null);
        phongTro.setKinhDo(null);

        when(nguoiDungRepository.findByTenDangNhap("khach_hang")).thenReturn(Optional.of(khachHang));
        when(phieuDatLichRepository.findByIdForUpdate(phieu.getMaDatLich())).thenReturn(Optional.of(phieu));

        ConfirmReceivedDepositRequest req = new ConfirmReceivedDepositRequest(10.776900, 106.700900);
        AppException ex = assertThrows(
                AppException.class,
                () -> appointmentService.khachHangXacNhanDaNhanCoc(phieu.getMaDatLich(), "khach_hang", req)
        );

        assertEquals(ErrorCode.ROOM_LOCATION_MISSING, ex.getErrorCode());
    }
}
