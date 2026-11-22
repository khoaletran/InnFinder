package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.ReviewRequestDTO;
import com.innfinder.backend.dto.response.ReviewResponseDTO;
import com.innfinder.backend.entity.DanhGia;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.DanhGiaRepository;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhongTroRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final DanhGiaRepository danhGiaRepository;
    private final PhongTroRepository phongTroRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final PhieuDatLichRepository phieuDatLichRepository;

    @Transactional
    public ReviewResponseDTO createReview(String roomId, ReviewRequestDTO request) {
        PhongTro phongTro = phongTroRepository.findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        NguoiDung nguoiDung = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getDiem() < 1 || request.getDiem() > 5) {
            throw new AppException(ErrorCode.INVALID_RATING);
        }

        // 1. KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT: Khách hàng phải có lịch hẹn xem phòng (XAC_NHAN hoặc HOAN_THANH) đối với phòng này
        boolean daXemHoacThue = phieuDatLichRepository.findByKhachHang_MaNguoiDungOrderByThoiGianDatDesc(nguoiDung.getMaNguoiDung())
                .stream()
                .anyMatch(p -> p.getPhongTro() != null &&
                        p.getPhongTro().getMaPhongTro().equals(roomId) &&
                        (p.getTrangThai() == TrangThaiDatLich.XAC_NHAN || p.getTrangThai() == TrangThaiDatLich.HOAN_THANH));

        if (!daXemHoacThue) {
            throw new AppException(ErrorCode.REVIEW_NOT_ALLOWED);
        }

        // 2. KIỂM TRA ĐÃ TỪNG ĐÁNH GIÁ CHƯA: Nếu có thì CẬP NHẬT thay vì tạo trùng lặp
        Optional<DanhGia> existingOpt = danhGiaRepository
                .findByPhongTro_MaPhongTroAndNguoiDung_MaNguoiDung(roomId, nguoiDung.getMaNguoiDung());

        if (existingOpt.isPresent()) {
            DanhGia existing = existingOpt.get();
            existing.setDiem(request.getDiem());
            existing.setNoiDung(request.getNoiDung());
            existing.setNgayDanhGia(LocalDateTime.now());
            return toResponseDTO(danhGiaRepository.save(existing));
        }

        // Nếu chưa có thì tạo mới
        String maDanhGia = "DG" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        DanhGia danhGia = DanhGia.builder()
                .maDanhGia(maDanhGia)
                .phongTro(phongTro)
                .nguoiDung(nguoiDung)
                .diem(request.getDiem())
                .noiDung(request.getNoiDung())
                .ngayDanhGia(LocalDateTime.now())
                .build();

        danhGia = danhGiaRepository.save(danhGia);
        return toResponseDTO(danhGia);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponseDTO> getReviewsByRoom(String roomId) {
        if (!phongTroRepository.existsById(roomId)) {
            throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        }

        List<DanhGia> list = danhGiaRepository.findByPhongTro_MaPhongTroOrderByNgayDanhGiaDesc(roomId);
        List<ReviewResponseDTO> result = new ArrayList<>();
        for (DanhGia dg : list) {
            result.add(toResponseDTO(dg));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<ReviewResponseDTO> getReviewsForCurrentLandlord() {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null || "anonymousUser".equals(username)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        NguoiDung user = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!Boolean.TRUE.equals(user.isChuTro())) {
            throw new AppException(ErrorCode.NOT_A_LANDLORD);
        }

        List<DanhGia> list = danhGiaRepository
                .findByPhongTro_ChuPhongTro_MaChuTroOrderByNgayDanhGiaDesc(user.getMaNguoiDung());

        List<ReviewResponseDTO> result = new ArrayList<>();
        for (DanhGia dg : list) {
            result.add(toResponseDTO(dg));
        }
        return result;
    }

    @Transactional
    public void deleteReview(String id) {
        DanhGia dg = danhGiaRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));
        danhGiaRepository.delete(dg);
    }

    private ReviewResponseDTO toResponseDTO(DanhGia dg) {
        String diaChi = dg.getPhongTro() != null ? dg.getPhongTro().getDiaChi() : null;
        String tieuDe = null;
        if (dg.getPhongTro() != null) {
            if (dg.getPhongTro().getMoTa() != null && !dg.getPhongTro().getMoTa().isBlank()) {
                String m = dg.getPhongTro().getMoTa();
                tieuDe = m.length() > 50 ? m.substring(0, 50) + "..." : m;
            } else {
                tieuDe = "Phòng trọ mã #" + dg.getPhongTro().getMaPhongTro();
            }
        }

        return ReviewResponseDTO.builder()
                .maDanhGia(dg.getMaDanhGia())
                .maPhongTro(dg.getPhongTro() != null ? dg.getPhongTro().getMaPhongTro() : null)
                .maNguoiDung(dg.getNguoiDung() != null ? dg.getNguoiDung().getMaNguoiDung() : null)
                .tenDangNhap(dg.getNguoiDung() != null ? dg.getNguoiDung().getTenDangNhap() : null)
                .hinhDaiDien(dg.getNguoiDung() != null ? dg.getNguoiDung().getHinhDaiDien() : null)
                .diem(dg.getDiem())
                .noiDung(dg.getNoiDung())
                .ngayDanhGia(dg.getNgayDanhGia())
                .diaChiPhong(diaChi)
                .tieuDePhong(tieuDe)
                .build();
    }   
}
