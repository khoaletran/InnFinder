package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.RejectRoomRequestDTO;
import com.innfinder.backend.dto.response.AdminStatisticsResponseDTO;
import com.innfinder.backend.dto.response.RoomResponseDTO;
import com.innfinder.backend.dto.response.UserResponseDTO;
import com.innfinder.backend.entity.HinhAnh;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.entity.enums.VaiTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.GiaoDichRepository;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhongTroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final PhongTroRepository phongTroRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final GiaoDichRepository giaoDichRepository;

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

        Long tongDoanhThu = giaoDichRepository.sumSoTienByTrangThai(TrangThaiGD.THANH_CONG);
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
                .coc(pt.getCoc())
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
}
