package com.innfinder.backend.repository;

import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.enums.VaiTro;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NguoiDungRepository extends JpaRepository<NguoiDung, String> {
    Optional<NguoiDung> findByTenDangNhap(String tenDangNhap);
    Boolean existsByTenDangNhap(String tenDangNhap);
    Boolean existsByEmail(String email);
    long countByVaiTro(VaiTro vaiTro);
    long countByChuTro(Boolean chuTro);
}
