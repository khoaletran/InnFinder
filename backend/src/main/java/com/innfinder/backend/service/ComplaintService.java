package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.ComplaintRequestDTO;
import com.innfinder.backend.dto.request.ComplaintResolveDTO;
import com.innfinder.backend.dto.response.ComplaintResponseDTO;
import com.innfinder.backend.entity.ChuTro;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuKhieuNai;
import com.innfinder.backend.entity.enums.MucDoViPham;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.ChuTroRepository;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuKhieuNaiRepository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplaintService {

    private final PhieuKhieuNaiRepository phieuKhieuNaiRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final ChuTroRepository chuTroRepository;

    @Transactional
    public ComplaintResponseDTO createComplaint(ComplaintRequestDTO request) {
        NguoiDung nguoiGui = nguoiDungRepository.findById(request.getMaNguoiGui()).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        NguoiDung doiTuong = nguoiDungRepository.findById(request.getDoiTuongKhieuNai()).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String maKhieuNai = "KN" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        PhieuKhieuNai kn = PhieuKhieuNai.builder()
                .maKhieuNai(maKhieuNai)
                .nguoiGui(nguoiGui)
                .doiTuongKhieuNai(doiTuong)
                .vanDe(request.getVanDe())
                .hinhAnh(request.getHinhAnh())
                .ngayGui(LocalDateTime.now())
                .trangThai(TrangThaiKhieuNai.CHO_DUYET)
                .mucDoUuTien(request.getMucDoUuTien() != null ? request.getMucDoUuTien() : 1)
                .mucDoViPham(MucDoViPham.NHE)
                .build();

        kn = phieuKhieuNaiRepository.save(kn);

        return toResponseDTO(kn);
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponseDTO> getAllComplaints() {
        List<PhieuKhieuNai> list = phieuKhieuNaiRepository.findAllByOrderByNgayGuiDesc();
        List<ComplaintResponseDTO> result = new ArrayList<>();
        for (PhieuKhieuNai kn : list) {
            result.add(toResponseDTO(kn));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponseDTO> getMyComplaints(String type) {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        NguoiDung currentUser = nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<PhieuKhieuNai> list;
        if ("SENT".equalsIgnoreCase(type)) {
            list = phieuKhieuNaiRepository.findByNguoiGui_MaNguoiDungOrderByNgayGuiDesc(currentUser.getMaNguoiDung());
        } else {
            // Mặc định RECEIVED: Khiếu nại gửi đến tôi
            list = phieuKhieuNaiRepository.findByDoiTuongKhieuNai_MaNguoiDungOrderByNgayGuiDesc(currentUser.getMaNguoiDung());
        }

        List<ComplaintResponseDTO> result = new ArrayList<>();
        for (PhieuKhieuNai kn : list) {
            result.add(toResponseDTO(kn));
        }
        return result;
    }

    @Transactional
    public ComplaintResponseDTO resolveComplaint(String id, ComplaintResolveDTO request) {
        PhieuKhieuNai kn = phieuKhieuNaiRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.COMPLAINT_NOT_FOUND));

        if (request.getNguoiDuyet() != null && !request.getNguoiDuyet().isBlank()) {
            NguoiDung nguoiDuyet = nguoiDungRepository.findById(request.getNguoiDuyet()).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            kn.setNguoiDuyet(nguoiDuyet);
        }

        if (request.getTrangThai() != null) {
            kn.setTrangThai(request.getTrangThai());
        }
        if (request.getMucDoViPham() != null) {
            kn.setMucDoViPham(request.getMucDoViPham());

            // Chế tài vi phạm theo AGENTS.md
            if (request.getMucDoViPham() == MucDoViPham.TRUNG_BINH && kn.getDoiTuongKhieuNai() != null) {
                // Trừ 10 điểm uy tín nếu đối tượng vi phạm là Chủ trọ
                chuTroRepository.findById(kn.getDoiTuongKhieuNai().getMaNguoiDung()).ifPresent(chuTro -> {
                    int diemHienTai = chuTro.getDiemUyTin() != null ? chuTro.getDiemUyTin() : 100;
                    chuTro.setDiemUyTin(Math.max(0, diemHienTai - 10));
                    chuTroRepository.save(chuTro);
                });
            } else if (request.getMucDoViPham() == MucDoViPham.NANG && kn.getDoiTuongKhieuNai() != null) {
                // Khóa tài khoản nếu vi phạm mức nặng
                NguoiDung doiTuong = kn.getDoiTuongKhieuNai();
                doiTuong.setTrangThaiKhoa(true);
                nguoiDungRepository.save(doiTuong);
            }
        }

        kn = phieuKhieuNaiRepository.save(kn);

        return toResponseDTO(kn);
    }

    private ComplaintResponseDTO toResponseDTO(PhieuKhieuNai kn) {
        return ComplaintResponseDTO.builder()
                .maKhieuNai(kn.getMaKhieuNai())
                .maNguoiGui(kn.getNguoiGui() != null ? kn.getNguoiGui().getMaNguoiDung() : null)
                .tenNguoiGui(kn.getNguoiGui() != null ? kn.getNguoiGui().getTenDangNhap() : null)
                .doiTuongKhieuNai(kn.getDoiTuongKhieuNai() != null ? kn.getDoiTuongKhieuNai().getMaNguoiDung() : null)
                .tenDoiTuongKhieuNai(kn.getDoiTuongKhieuNai() != null ? kn.getDoiTuongKhieuNai().getTenDangNhap() : null)
                .nguoiDuyet(kn.getNguoiDuyet() != null ? kn.getNguoiDuyet().getMaNguoiDung() : null)
                .tenNguoiDuyet(kn.getNguoiDuyet() != null ? kn.getNguoiDuyet().getTenDangNhap() : null)
                .vanDe(kn.getVanDe())
                .hinhAnh(kn.getHinhAnh())
                .ngayGui(kn.getNgayGui())
                .trangThai(kn.getTrangThai())
                .mucDoUuTien(kn.getMucDoUuTien())
                .mucDoViPham(kn.getMucDoViPham())
                .build();
    }
}
