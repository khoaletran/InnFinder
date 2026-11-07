package com.innfinder.backend.repository;

import com.innfinder.backend.entity.PhieuKhieuNai;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhieuKhieuNaiRepository extends JpaRepository<PhieuKhieuNai, String> {
    List<PhieuKhieuNai> findAllByOrderByNgayGuiDesc();
    List<PhieuKhieuNai> findByTrangThai(TrangThaiKhieuNai trangThai);
    List<PhieuKhieuNai> findByDoiTuongKhieuNai_MaNguoiDungOrderByNgayGuiDesc(String maNguoiDung);
    List<PhieuKhieuNai> findByNguoiGui_MaNguoiDungOrderByNgayGuiDesc(String maNguoiDung);
}
