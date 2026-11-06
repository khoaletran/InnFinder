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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final DanhGiaRepository danhGiaRepository;
    private final PhongTroRepository phongTroRepository;
    private final NguoiDungRepository nguoiDungRepository;

    @Transactional
    public ReviewResponseDTO createReview(String roomId, ReviewRequestDTO request) {
        PhongTro phongTro = phongTroRepository.findById(roomId).orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        NguoiDung nguoiDung = nguoiDungRepository.findById(request.getMaNguoiDung()).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getDiem() < 1 || request.getDiem() > 5) {
            throw new AppException(ErrorCode.INVALID_RATING);
        }

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

    private ReviewResponseDTO toResponseDTO(DanhGia dg) {
        return ReviewResponseDTO.builder()
                .maDanhGia(dg.getMaDanhGia())
                .maPhongTro(dg.getPhongTro() != null ? dg.getPhongTro().getMaPhongTro() : null)
                .maNguoiDung(dg.getNguoiDung() != null ? dg.getNguoiDung().getMaNguoiDung() : null)
                .tenDangNhap(dg.getNguoiDung() != null ? dg.getNguoiDung().getTenDangNhap() : null)
                .hinhDaiDien(dg.getNguoiDung() != null ? dg.getNguoiDung().getHinhDaiDien() : null)
                .diem(dg.getDiem())
                .noiDung(dg.getNoiDung())
                .ngayDanhGia(dg.getNgayDanhGia())
                .build();
    }
}
