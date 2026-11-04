package com.innfinder.backend.repository;

import com.innfinder.backend.entity.GiaoDich;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GiaoDichRepository extends JpaRepository<GiaoDich,String> {
    /**
     * Lấy toàn bộ lịch sử giao dịch (nạp/giữ cọc/hoàn tiền) của một người dùng
     * Sắp xếp theo thời gian giao dịch mới nhất lên đầu
     * Dùng cho endpoint: GET /api/transactions/my-history
     */
    List<GiaoDich> findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(String nguoiDungMaNguoiDung);
}
