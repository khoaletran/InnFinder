package com.innfinder.backend.repository;

import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhongTroRepository extends JpaRepository<PhongTro, String> {
    List<PhongTro> findByTrangThai(TrangThaiPhongTro trangThai);
    long countByTrangThai(TrangThaiPhongTro trangThai);
}
