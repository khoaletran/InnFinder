package com.innfinder.backend.repository;

import com.innfinder.backend.entity.DanhGia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DanhGiaRepository extends JpaRepository<DanhGia, String> {
    List<DanhGia> findByPhongTro_MaPhongTroOrderByNgayDanhGiaDesc(String maPhongTro);
    Optional<DanhGia> findByPhongTro_MaPhongTroAndNguoiDung_MaNguoiDung(String maPhongTro, String maNguoiDung);
}
