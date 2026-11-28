package com.innfinder.backend.repository;

import com.innfinder.backend.entity.YeuCauChuTro;
import com.innfinder.backend.entity.enums.TrangThaiYeuCauChuTro;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface YeuCauChuTroRepository extends JpaRepository<YeuCauChuTro, String> {

    @EntityGraph(attributePaths = {"nguoiDung"})
    List<YeuCauChuTro> findAllByOrderByNgayGuiDesc();

    @EntityGraph(attributePaths = {"nguoiDung"})
    List<YeuCauChuTro> findByTrangThaiOrderByNgayGuiDesc(TrangThaiYeuCauChuTro trangThai);

    @EntityGraph(attributePaths = {"nguoiDung"})
    Optional<YeuCauChuTro> findTopByNguoiDung_MaNguoiDungOrderByNgayGuiDesc(String maNguoiDung);

    @Override
    @EntityGraph(attributePaths = {"nguoiDung"})
    Optional<YeuCauChuTro> findById(String id);

    boolean existsByNguoiDung_MaNguoiDungAndTrangThai(String maNguoiDung, TrangThaiYeuCauChuTro trangThai);

    long countByTrangThai(TrangThaiYeuCauChuTro trangThai);
}
