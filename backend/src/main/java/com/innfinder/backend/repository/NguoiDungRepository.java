package com.innfinder.backend.repository;

import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.enums.VaiTro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NguoiDungRepository extends JpaRepository<NguoiDung, String> {
    Optional<NguoiDung> findByTenDangNhap(String tenDangNhap);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT n FROM NguoiDung n WHERE n.maNguoiDung = :id")
    Optional<NguoiDung> findByIdForUpdate(@Param("id") String id);
    Boolean existsByTenDangNhap(String tenDangNhap);
    Boolean existsByEmail(String email);
    long countByVaiTroAndTrangThaiKhoaFalse(VaiTro vaiTro);

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

    @Query("""
            SELECT COUNT(u),
                   COALESCE(SUM(CASE WHEN u.vaiTro = com.innfinder.backend.entity.enums.VaiTro.KHACH_HANG THEN 1L ELSE 0L END), 0L),
                   COALESCE(SUM(CASE WHEN u.chuTro = true THEN 1L ELSE 0L END), 0L)
            FROM NguoiDung u
            WHERE (:hasFilter = false OR (
                u.thoiGianMoTaiKhoan IS NOT NULL
                AND (:year IS NULL OR YEAR(u.thoiGianMoTaiKhoan) = :year)
                AND (:month IS NULL OR MONTH(u.thoiGianMoTaiKhoan) = :month)
                AND (:day IS NULL OR DAY(u.thoiGianMoTaiKhoan) = :day)
            ))
            """)
    List<Object[]> aggregateUserCounts(
            @Param("hasFilter") boolean hasFilter,
            @Param("day") Integer day,
            @Param("month") Integer month,
            @Param("year") Integer year
    );
}
