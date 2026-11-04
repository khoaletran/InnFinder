package com.innfinder.backend.service;

import com.innfinder.backend.dto.request.ComplaintRequestDTO;
import com.innfinder.backend.dto.request.ComplaintResolveDTO;
import com.innfinder.backend.dto.response.ComplaintResponseDTO;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuKhieuNai;
import com.innfinder.backend.entity.enums.MucDoViPham;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuKhieuNaiRepository;
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
