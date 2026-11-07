package com.innfinder.backend.repository;

import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GiaoDichRepository extends JpaRepository<GiaoDich,String> {
    @Query("SELECT MAX(g.maGiaoDich) FROM GiaoDich g WHERE g.maGiaoDich LIKE CONCAT(:prefix, '%')")
    String findMaxMaGiaoDichByPrefix(@Param("prefix") String prefix);
    /**
     * Lấy toàn bộ lịch sử giao dịch (nạp/giữ cọc/hoàn tiền) của một người dùng
     * Sắp xếp theo thời gian giao dịch mới nhất lên đầu
     * Dùng cho endpoint: GET /api/transactions/my-history
     */
    List<GiaoDich> findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(String nguoiDungMaNguoiDung);
    @Query("SELECT COALESCE(SUM(g.soTien), 0) FROM GiaoDich g WHERE g.trangThai = :trangThai")
    Long sumSoTienByTrangThai(@Param("trangThai") TrangThaiGD trangThai);
}
