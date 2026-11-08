package com.innfinder.backend.repository;

import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GiaoDichRepository extends JpaRepository<GiaoDich, String> {
    @Query("SELECT MAX(g.maGiaoDich) FROM GiaoDich g WHERE g.maGiaoDich LIKE CONCAT(:prefix, '%')")
    String findMaxMaGiaoDichByPrefix(@Param("prefix") String prefix);

    /**
     * Lấy toàn bộ lịch sử giao dịch (nạp/giữ cọc/hoàn tiền) của một người dùng
     * Sắp xếp theo thời gian giao dịch mới nhất lên đầu
     * Dùng cho endpoint: GET /api/transactions/my-history
     */
    List<GiaoDich> findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(String nguoiDungMaNguoiDung);

    /**
     * Lấy toàn bộ giao dịch trên hệ thống cho Admin
     */
    List<GiaoDich> findAllByOrderByNgayGiaoDichDesc();

    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g WHERE g.trangThai = :trangThai")
    Long sumSoTienByTrangThai(@Param("trangThai") TrangThaiGD trangThai);

    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g WHERE g.loaiGiaoDich = :loaiGiaoDich AND g.trangThai = :trangThai")
    Long sumSoTienByLoaiAndTrangThai(@Param("loaiGiaoDich") String loaiGiaoDich, @Param("trangThai") TrangThaiGD trangThai);

    long countByLoaiGiaoDichAndTrangThai(String loaiGiaoDich, TrangThaiGD trangThai);

    /**
     * Khóa bi quan (Pessimistic Lock) khi Admin phê duyệt giao dịch để chống race-condition / nhiều Admin duyệt trùng
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM GiaoDich g WHERE g.maGiaoDich = :maGiaoDich")
    Optional<GiaoDich> findByIdForUpdate(@Param("maGiaoDich") String maGiaoDich);
}
