package com.innfinder.backend.repository;

import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PhieuDatLichRepository extends JpaRepository<PhieuDatLich, String> {
    /**
     * 1. Lấy danh sách lịch hẹn của một khách hàng (sắp xếp ngày hẹn mới nhất lên đầu)
     * Dùng cho endpoint: GET /api/appointments/my-appointments
     */
    List<PhieuDatLich> findByKhachHang_MaNguoiDungOrderByNgayHenDesc(String maKhachHang);

    /**
     * 2. Lấy danh sách lịch hẹn đặt vào các phòng thuộc sở hữu của một Chủ trọ
     * Dùng cho endpoint: GET /api/landlord/appointments
     * Cần nối bảng: PhieuDatLich -> PhongTro -> ChuTro -> maChuTro
     */
    @Query(
            "select p from PhieuDatLich p " +
                    "where p.phongTro.chuPhongTro.maChuTro = :maChuTro " +
                    "order by  p.ngayHen desc "
    )
    List<PhieuDatLich> findAppointmentsByLandlordId(@Param("maChuTro") String maChuTro);

    /**
     * 3. (Phụ trợ) Lọc lịch hẹn của khách hàng theo trạng thái cụ thể
     */
    List<PhieuDatLich> findByKhachHang_MaNguoiDungAndTrangThai(String maNguoiDung, TrangThaiDatLich trangThai);

    /**
     * 4. (Phụ trợ) Lấy toàn bộ lịch hẹn của một phòng trọ cụ thể
     */
    List<PhieuDatLich> findByPhongTro_MaPhongTro(String maPhongTro);

    /**
     * 5. Tính tổng doanh thu phí hoa hồng hệ thống từ các lịch hẹn theo trạng thái
     */
    @Query("SELECT COALESCE(SUM(p.phiThu), 0L) FROM PhieuDatLich p WHERE p.trangThai = :trangThai")
    Long sumPhiThuByTrangThai(@Param("trangThai") TrangThaiDatLich trangThai);
}
