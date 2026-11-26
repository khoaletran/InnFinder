package com.innfinder.backend.repository;

import com.innfinder.backend.entity.PhieuKhieuNai;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhieuKhieuNaiRepository extends JpaRepository<PhieuKhieuNai, String> {
    @EntityGraph(attributePaths = {"nguoiGui", "doiTuongKhieuNai", "nguoiDuyet"})
    List<PhieuKhieuNai> findAllByOrderByNgayGuiDesc();

    List<PhieuKhieuNai> findByTrangThai(TrangThaiKhieuNai trangThai);

    @EntityGraph(attributePaths = {"nguoiGui", "doiTuongKhieuNai", "nguoiDuyet"})
    List<PhieuKhieuNai> findByDoiTuongKhieuNai_MaNguoiDungOrderByNgayGuiDesc(String maNguoiDung);

    @EntityGraph(attributePaths = {"nguoiGui", "doiTuongKhieuNai", "nguoiDuyet"})
    List<PhieuKhieuNai> findByNguoiGui_MaNguoiDungOrderByNgayGuiDesc(String maNguoiDung);
    List<PhieuKhieuNai> findTop20ByDoiTuongKhieuNai_MaNguoiDungOrderByNgayGuiDesc(String id);

}
