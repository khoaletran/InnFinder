package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.RejectRoomRequestDTO;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO;
import com.innfinder.backend.dto.response.RoomResponseDTO;
import com.innfinder.backend.dto.response.UserResponseDTO;
import com.innfinder.backend.entity.HinhAnh;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.entity.enums.VaiTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.repository.PhongTroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.innfinder.backend.dto.request.RejectLandlordRequestDTO;
import com.innfinder.backend.dto.response.LandlordRequestResponseDTO;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.TaiKhoanNganHang;
import com.innfinder.backend.entity.YeuCauChuTro;
import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import com.innfinder.backend.repository.ChuTroRepository;
import com.innfinder.backend.repository.TaiKhoanNganHangRepository;
import com.innfinder.backend.repository.YeuCauChuTroRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final PhongTroRepository phongTroRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final PhieuDatLichRepository phieuDatLichRepository;
    private final YeuCauChuTroRepository yeuCauChuTroRepository;
    private final ChuTroRepository chuTroRepository;
    private final TaiKhoanNganHangRepository taiKhoanNganHangRepository;

    @Transactional(readOnly = true)
    public List<RoomResponseDTO> getPendingRooms() {
        List<PhongTro> list = phongTroRepository.findByTrangThai(TrangThaiPhongTro.CHO_DUYET);
        List<RoomResponseDTO> result = new ArrayList<>();
        for (PhongTro pt : list) {
            result.add(toRoomResponseDTO(pt));
        }
        return result;
    }

    @Transactional
    public RoomResponseDTO approveRoom(String id) {
        PhongTro room = phongTroRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        room.setTrangThai(TrangThaiPhongTro.DA_DUYET);
        room = phongTroRepository.save(room);

        return toRoomResponseDTO(room);
    }

    @Transactional
    public RoomResponseDTO rejectRoom(String id, RejectRoomRequestDTO request) {
        PhongTro room = phongTroRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        room.setTrangThai(TrangThaiPhongTro.HUY);
        if (request != null && request.getLyDo() != null && !request.getLyDo().isBlank()) {
            String moTaCu = room.getMoTa() != null ? room.getMoTa() : "";
            room.setMoTa(moTaCu + " [LÝ DO TỪ CHỐI DUYỆT: " + request.getLyDo() + "]");
        }
        room = phongTroRepository.save(room);
        return toRoomResponseDTO(room);
    }

    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        List<NguoiDung> list = nguoiDungRepository.findAll();
        List<UserResponseDTO> result = new ArrayList<>();
        for (NguoiDung u : list) {
            result.add(toUserResponseDTO(u));
        }
        return result;
    }

    @Transactional
    public UserResponseDTO toggleLockUser(String id) {
        NguoiDung user = nguoiDungRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        boolean currentStatus = Boolean.TRUE.equals(user.getTrangThaiKhoa());
        user.setTrangThaiKhoa(!currentStatus);
        user = nguoiDungRepository.save(user);
        return toUserResponseDTO(user);
    }

    @Transactional(readOnly = true)
    public AdminStatisticsResponseDTO getStatistics() {
        long tongSoPhong = phongTroRepository.count();
        long soPhongChoDuyet = phongTroRepository.countByTrangThai(TrangThaiPhongTro.CHO_DUYET);
        long soPhongDaDuyet = phongTroRepository.countByTrangThai(TrangThaiPhongTro.DA_DUYET);
        long soPhongHoanThanh = phongTroRepository.countByTrangThai(TrangThaiPhongTro.HOAN_THANH);
        long soPhongHuy = phongTroRepository.countByTrangThai(TrangThaiPhongTro.HUY);

        long tongNguoiDung = nguoiDungRepository.count();
        long soKhachHang = nguoiDungRepository.countByVaiTro(VaiTro.KHACH_HANG);
        long soChuTro = nguoiDungRepository.countByChuTro(true);

        // Doanh thu sàn chuẩn nghiệp vụ: Tổng phí hoa hồng (phiThu) từ các phiếu đặt lịch đã hoàn thành
        Long tongDoanhThu = phieuDatLichRepository.sumPhiThuByTrangThai(TrangThaiDatLich.HOAN_THANH);
        if (tongDoanhThu == null) {
            tongDoanhThu = 0L;
        }

        return AdminStatisticsResponseDTO.builder()
                .tongSoPhong(tongSoPhong)
                .soPhongChoDuyet(soPhongChoDuyet)
                .soPhongDaDuyet(soPhongDaDuyet)
                .soPhongHoanThanh(soPhongHoanThanh)
                .soPhongHuy(soPhongHuy)
                .tongNguoiDung(tongNguoiDung)
                .soKhachHang(soKhachHang)
                .soChuTro(soChuTro)
                .tongDoanhThu(tongDoanhThu)
                .build();
    }

    private RoomResponseDTO toRoomResponseDTO(PhongTro pt) {
        List<String> imageUrls = new ArrayList<>();
        if (pt.getHinhAnh() != null) {
            for (HinhAnh ha : pt.getHinhAnh()) {
                imageUrls.add(ha.getUrl());
            }
        }

        String tenChuTro = null;
        String sdtChuTro = null;
        if (pt.getChuPhongTro() != null && pt.getChuPhongTro().getNguoiDung() != null) {
            tenChuTro = pt.getChuPhongTro().getNguoiDung().getTenDangNhap();
            sdtChuTro = pt.getChuPhongTro().getNguoiDung().getSdt();
        }

        String tenLoaiPhong = pt.getLoaiPhong() != null ? pt.getLoaiPhong().getTenLoaiPhongTro() : null;
        String maLoaiPhong = pt.getLoaiPhong() != null ? pt.getLoaiPhong().getMaLpt() : null;

        return RoomResponseDTO.builder()
                .maPhongTro(pt.getMaPhongTro())
                .maChuTro(pt.getChuPhongTro() != null ? pt.getChuPhongTro().getMaChuTro() : null)
                .tenChuTro(tenChuTro)
                .sdtChuTro(sdtChuTro)
                .maLoaiPhong(maLoaiPhong)
                .tenLoaiPhong(tenLoaiPhong)
                .giaThue(pt.getGiaThue())
                .dienTich(pt.getDienTich())
                .soNguoi(pt.getSoNguoi())
                .diaChi(pt.getDiaChi())
                .moTa(pt.getMoTa())
                .coc(pt.getCocPhong())
                .trangThai(pt.getTrangThai())
                .thoiGianDang(pt.getThoiGianDang())
                .hinhAnhUrls(imageUrls)
                .build();
    }

    private UserResponseDTO toUserResponseDTO(NguoiDung u) {
        return UserResponseDTO.builder()
                .maNguoiDung(u.getMaNguoiDung())
                .tenDangNhap(u.getTenDangNhap())
                .email(u.getEmail())
                .sdt(u.getSdt())
                .cccd(u.getCccd())
                .vaiTro(u.getVaiTro())
                .hinhDaiDien(u.getHinhDaiDien())
                .thoiGianMoTaiKhoan(u.getThoiGianMoTaiKhoan())
                .chuTro(u.getChuTro())
                .trangThaiKhoa(u.getTrangThaiKhoa())
                .build();
    }

    // ==========================================
    // QUẢN LÝ ĐƠN ĐĂNG KÝ CHỦ TRỌ
    // ==========================================

    @Transactional(readOnly = true)
    public List<LandlordRequestResponseDTO> getLandlordRequests() {
        return yeuCauChuTroRepository.findAllByOrderByNgayGuiDesc()
                .stream()
                .map(LandlordRequestResponseDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public LandlordRequestResponseDTO getLandlordRequestById(String id) {
        YeuCauChuTro yc = yeuCauChuTroRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LANDLORD_REQUEST_NOT_FOUND));
        return LandlordRequestResponseDTO.fromEntity(yc);
    }

    @Transactional
    public LandlordRequestResponseDTO approveLandlordRequest(String id) {
        YeuCauChuTro yc = yeuCauChuTroRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LANDLORD_REQUEST_NOT_FOUND));

        if (yc.getTrangThai() != TrangThaiYeuCauChuTro.CHO_DUYET) {
            throw new RuntimeException("Đơn đăng ký không ở trạng thái chờ duyệt!");
        }

        // 1. Cập nhật trạng thái đơn
        yc.setTrangThai(TrangThaiYeuCauChuTro.DA_DUYET);
        yc.setNgayDuyet(LocalDateTime.now());
        yc = yeuCauChuTroRepository.save(yc);

        // 2. Kích hoạt vai trò Chủ trọ cho người dùng
        NguoiDung user = yc.getNguoiDung();
        user.setCccd(yc.getCccd());
        user.setChuTro(true);
        nguoiDungRepository.save(user);

        // 3. Khởi tạo bản ghi ChuTro nếu chưa có (100 điểm uy tín, số dư = 0)
        chuTroRepository.findById(user.getMaNguoiDung())
                .orElseGet(() -> chuTroRepository.save(ChuTro.builder()
                        .maChuTro(user.getMaNguoiDung())
                        .nguoiDung(user)
                        .diemUyTin(100)
                        .soDu(0L)
                        .build()));

        // 4. Lưu tài khoản ngân hàng thụ hưởng
        TaiKhoanNganHang tk = TaiKhoanNganHang.builder()
                .soTaiKhoan(yc.getSoTaiKhoan())
                .tenNganHang(yc.getTenNganHang())
                .nguoiDung(user)
                .build();
        taiKhoanNganHangRepository.save(tk);

        return LandlordRequestResponseDTO.fromEntity(yc);
    }

    @Transactional
    public LandlordRequestResponseDTO rejectLandlordRequest(String id, RejectLandlordRequestDTO request) {
        YeuCauChuTro yc = yeuCauChuTroRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LANDLORD_REQUEST_NOT_FOUND));

        if (yc.getTrangThai() != TrangThaiYeuCauChuTro.CHO_DUYET) {
            throw new RuntimeException("Đơn đăng ký không ở trạng thái chờ duyệt!");
        }

        yc.setTrangThai(TrangThaiYeuCauChuTro.TU_CHOI);
        yc.setNgayDuyet(LocalDateTime.now());
        yc.setLyDoTuChoi(request != null && request.getLyDo() != null && !request.getLyDo().isBlank()
                ? request.getLyDo()
                : "Hồ sơ không đáp ứng tiêu chuẩn xét duyệt");

        yc = yeuCauChuTroRepository.save(yc);
        return LandlordRequestResponseDTO.fromEntity(yc);
    }
}
