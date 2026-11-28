package com.innfinder.backend.repository;

import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PhieuDatLichRepository extends JpaRepository<PhieuDatLich, String> {
    @Query("SELECT MAX(p.maDatLich) FROM PhieuDatLich p WHERE p.maDatLich LIKE CONCAT(:prefix, '%')")
    String findMaxMaDatLichByPrefix(@Param("prefix") String prefix);

    @EntityGraph(attributePaths = {"khachHang", "phongTro", "phongTro.hinhAnh", "phongTro.chuPhongTro", "phongTro.chuPhongTro.nguoiDung"})
    List<PhieuDatLich> findByKhachHang_MaNguoiDungOrderByThoiGianDatDesc(String khachHangMaNguoiDung);

    /**
     * 2. Lấy danh sách lịch hẹn đặt vào các phòng thuộc sở hữu của một Chủ trọ
     * Dùng cho endpoint: GET /api/landlord/appointments
     * Cần nối bảng: PhieuDatLich -> PhongTro -> ChuTro -> maChuTro
     */
    @EntityGraph(attributePaths = {"khachHang", "phongTro", "phongTro.hinhAnh", "phongTro.chuPhongTro", "phongTro.chuPhongTro.nguoiDung"})
    @Query(
            "select p from PhieuDatLich p " +
                    "where p.phongTro.chuPhongTro.maChuTro = :maChuTro " +
                    "order by  p.ngayHen desc "
    )
    List<PhieuDatLich> findAppointmentsByLandlordId(@Param("maChuTro") String maChuTro);

    /**
     * 3. (Phụ trợ) Lọc lịch hẹn của khách hàng theo trạng thái cụ thể
     */
    @EntityGraph(attributePaths = {"khachHang", "phongTro", "phongTro.hinhAnh", "phongTro.chuPhongTro", "phongTro.chuPhongTro.nguoiDung"})
    List<PhieuDatLich> findByKhachHang_MaNguoiDungAndTrangThaiInOrderByNgayHenDesc(
            String maNguoiDung,
            List<TrangThaiDatLich> trangThais
    );

    @EntityGraph(attributePaths = {"khachHang", "phongTro", "phongTro.hinhAnh", "phongTro.chuPhongTro", "phongTro.chuPhongTro.nguoiDung"})
    List<PhieuDatLich> findByPhongTro_ChuPhongTro_NguoiDung_MaNguoiDungAndTrangThaiInOrderByNgayHenDesc(
            String maNguoiDung,
            List<TrangThaiDatLich> trangThais
    );

    List<PhieuDatLich> findByPhongTro_ChuPhongTro_MaChuTroAndTrangThaiIn(
            String maChuTro,
            List<TrangThaiDatLich> trangThais
    );

    @Query("SELECT COUNT(p) > 0 FROM PhieuDatLich p " +
           "WHERE p.phongTro.chuPhongTro.maChuTro = :maChuTro " +
           "AND p.trangThai IN :trangThais " +
           "AND (p.ngayHen > :since OR p.thoiGianDat > :since)")
    boolean existsRecentValidAppointment(
            @Param("maChuTro") String maChuTro,
            @Param("trangThais") List<TrangThaiDatLich> trangThais,
            @Param("since") LocalDateTime since
    );

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

    /**
     * 6. Tính tổng cọc giữ chân đang tạm giữ theo trạng thái
     */
    @Query("SELECT COALESCE(SUM(p.coc), 0L) FROM PhieuDatLich p WHERE p.trangThai = :trangThai AND p.coc > 0")
    Long sumCocByTrangThai(@Param("trangThai") TrangThaiDatLich trangThai);

    /**
     * 7. Khóa bi quan (Pessimistic Lock) khi duyệt, hủy hoặc xử lý quyết toán lịch hẹn
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PhieuDatLich p WHERE p.maDatLich = :maDatLich")
    Optional<PhieuDatLich> findByIdForUpdate(@Param("maDatLich") String maDatLich);

    /**
     * 8. Kiểm tra lịch trùng đang hoạt động của cùng một khách hàng cho cùng một phòng
     */
    @Query("SELECT COUNT(p) > 0 FROM PhieuDatLich p " +
           "WHERE p.khachHang.maNguoiDung = :maKhachHang " +
           "AND p.phongTro.maPhongTro = :maPhongTro " +
           "AND p.ngayHen = :ngayHen " +
           "AND (p.trangThai = com.innfinder.backend.entity.enums.TrangThaiDatLich.XAC_NHAN " +
           "     OR (p.trangThai = com.innfinder.backend.entity.enums.TrangThaiDatLich.CHO_XAC_NHAN " +
           "         AND p.thoiGianDat > :minBookingTime " +
           "         AND p.ngayHen > :minViewingTime))")
    boolean existsActiveDuplicateAppointment(
            @Param("maKhachHang") String maKhachHang,
            @Param("maPhongTro") String maPhongTro,
            @Param("ngayHen") LocalDateTime ngayHen,
            @Param("minBookingTime") LocalDateTime minBookingTime,
            @Param("minViewingTime") LocalDateTime minViewingTime
    );

    /**
     * 9. Lấy tất cả các lịch hẹn đang hoạt động khác của một phòng trọ để hủy dây chuyền khi phòng đã có khách chốt thuê
     */
    @Query("SELECT p FROM PhieuDatLich p WHERE p.phongTro.maPhongTro = :maPhongTro " +
           "AND p.trangThai IN :trangThais AND p.maDatLich <> :excludeMaDatLich")
    List<PhieuDatLich> findOtherActiveAppointmentsByRoom(
            @Param("maPhongTro") String maPhongTro,
            @Param("trangThais") List<TrangThaiDatLich> trangThais,
            @Param("excludeMaDatLich") String excludeMaDatLich
    );

    /**
     * 10. Lấy các lịch hẹn của một phòng trọ trong khoảng thời gian để kiểm tra trùng khung giờ (kèm khoảng đệm)
     */
    @Query("SELECT p FROM PhieuDatLich p WHERE p.phongTro.maPhongTro = :maPhongTro " +
           "AND p.ngayHen BETWEEN :startTime AND :endTime " +
           "AND p.trangThai IN :trangThais")
    List<PhieuDatLich> findAppointmentsByRoomAndTimeRange(
            @Param("maPhongTro") String maPhongTro,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("trangThais") List<TrangThaiDatLich> trangThais
    );

    /**
     * 11. Lấy các lịch hẹn đang hoạt động của một khách hàng cho một phòng trọ cụ thể
     */
    List<PhieuDatLich> findByKhachHang_MaNguoiDungAndPhongTro_MaPhongTroAndTrangThaiIn(
            String maKhachHang,
            String maPhongTro,
            List<TrangThaiDatLich> trangThais
    );

    List<PhieuDatLich> findTop20ByPhongTro_ChuPhongTro_MaChuTroOrderByThoiGianDatDesc(String id);

    /**
     * 7. Lấy toàn bộ phiếu đặt lịch cho Admin giám sát
     */
    @EntityGraph(attributePaths = {"khachHang", "phongTro", "phongTro.loaiPhong", "phongTro.chuPhongTro", "phongTro.chuPhongTro.nguoiDung"})
    List<PhieuDatLich> findAllByOrderByNgayHenDesc();

    @EntityGraph(attributePaths = {"khachHang", "phongTro", "phongTro.loaiPhong", "phongTro.chuPhongTro", "phongTro.chuPhongTro.nguoiDung"})
    @Query("SELECT p FROM PhieuDatLich p WHERE " +
           "LOWER(p.maDatLich) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.phongTro.maPhongTro) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.khachHang.maNguoiDung) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "p.khachHang.sdt LIKE CONCAT('%', :kw, '%') OR " +
           "LOWER(p.phongTro.chuPhongTro.maChuTro) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "p.phongTro.chuPhongTro.nguoiDung.sdt LIKE CONCAT('%', :kw, '%') " +
           "ORDER BY p.ngayHen DESC")
    List<PhieuDatLich> searchByCodeOrPhone(@Param("kw") String kw, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.coc), 0L) FROM PhieuDatLich p " +
           "WHERE p.trangThai IN (com.innfinder.backend.entity.enums.TrangThaiDatLich.CHO_XAC_NHAN, com.innfinder.backend.entity.enums.TrangThaiDatLich.XAC_NHAN) " +
           "AND p.coc > 0 AND EXISTS (" +
           "  SELECT 1 FROM GiaoDich g WHERE g.nguoiDung = p.khachHang " +
           "  AND g.loaiGiaoDich = 'COC_XEM_PHONG' " +
           "  AND g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.THANH_CONG " +
           "  AND g.noiDung LIKE CONCAT('%', p.maDatLich, '%'))")
    Long sumActiveHeldDeposit();

    /**
     * 8. Lấy danh sách phiếu đặt lịch theo trạng thái (phục vụ thống kê doanh thu theo tháng)
     */
    List<PhieuDatLich> findByTrangThai(TrangThaiDatLich trangThai);

    /**
     * 9. Lấy các lịch hẹn có cọc giữ chân giữa một khách hàng và một chủ trọ (phục vụ đối soát khiếu nại)
     */
    @EntityGraph(attributePaths = {"phongTro", "phongTro.loaiPhong", "phongTro.chuPhongTro"})
    List<PhieuDatLich> findByKhachHang_MaNguoiDungAndPhongTro_ChuPhongTro_MaChuTroAndCocGreaterThanOrderByNgayHenDesc(
            String maKhachHang,
            String maChuTro,
            Long minCoc
    );
    List<PhieuDatLich> findTop10ByKhachHang_MaNguoiDungOrderByNgayHenDesc(String userId);

    @Query("SELECT p.maDatLich, p.trangThai, p.phiThu, p.coc, p.ngayHen, p.thoiGianDat, " +
           "p.daNhanLaiCoc, p.khachHangDongY, p.chuTroDongY, p.liDoHuy, lp.tenLoaiPhongTro " +
           "FROM PhieuDatLich p LEFT JOIN p.phongTro pt LEFT JOIN pt.loaiPhong lp")
    List<Object[]> findAppointmentStatsRows();
}
