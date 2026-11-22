package com.innfinder.backend.repository;

import com.innfinder.backend.entity.YeuCauChuTro;
import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface YeuCauChuTroRepository extends JpaRepository<YeuCauChuTro, String> {

    List<YeuCauChuTro> findAllByOrderByNgayGuiDesc();

    List<YeuCauChuTro> findByTrangThaiOrderByNgayGuiDesc(TrangThaiYeuCauChuTro trangThai);

    Optional<YeuCauChuTro> findTopByNguoiDung_MaNguoiDungOrderByNgayGuiDesc(String maNguoiDung);

    boolean existsByNguoiDung_MaNguoiDungAndTrangThai(String maNguoiDung, TrangThaiYeuCauChuTro trangThai);

    long countByTrangThai(TrangThaiYeuCauChuTro trangThai);
}
