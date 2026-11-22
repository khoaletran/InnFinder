package com.innfinder.backend.repository;

import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.enums.VaiTro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NguoiDungRepository extends JpaRepository<NguoiDung, String> {
    Optional<NguoiDung> findByTenDangNhap(String tenDangNhap);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT n FROM NguoiDung n WHERE n.maNguoiDung = :id")
    Optional<NguoiDung> findByIdForUpdate(@Param("id") String id);
    Boolean existsByTenDangNhap(String tenDangNhap);
    Boolean existsByEmail(String email);
    long countByVaiTro(VaiTro vaiTro);
    long countByVaiTroAndTrangThaiKhoaFalse(VaiTro vaiTro);
    long countByChuTro(Boolean chuTro);

    Page<NguoiDung> findAllByOrderByThoiGianMoTaiKhoanDesc(Pageable pageable);

    @Query("SELECT MAX(n.maNguoiDung) FROM NguoiDung n WHERE n.maNguoiDung LIKE CONCAT(:prefix, '%')")
    String findMaxMaNguoiDungByPrefix(@Param("prefix") String prefix);

    @Query("SELECT n FROM NguoiDung n WHERE " +
           "LOWER(n.maNguoiDung) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "n.sdt LIKE CONCAT('%', :kw, '%') OR " +
           "LOWER(n.email) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(n.tenDangNhap) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(n.hoVaTen) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "n.cccd LIKE CONCAT('%', :kw, '%') " +
           "ORDER BY n.thoiGianMoTaiKhoan DESC")
    Page<NguoiDung> searchUsersByInfo(@Param("kw") String keyword, Pageable pageable);
}
