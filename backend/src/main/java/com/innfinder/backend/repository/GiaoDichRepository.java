package com.innfinder.backend.repository;

import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /**
     * Lấy danh sách giao dịch theo trạng thái (ví dụ: CHO_THANH_TOAN để phục vụ duyệt/chờ xử lý)
     */
    List<GiaoDich> findByTrangThaiOrderByNgayGiaoDichDesc(TrangThaiGD trangThai);

    Page<GiaoDich> findByTrangThaiOrderByNgayGiaoDichDesc(TrangThaiGD trangThai, Pageable pageable);

    /**
     * Khi người dùng có thắc mắc, cung cấp thông tin cá nhân (SĐT, Email, Tên đăng nhập, Họ tên, CCCD, Mã người dùng hoặc Mã GD)
     * Admin tìm kiếm sẽ lấy TOÀN BỘ lịch sử giao dịch của người đó để đối soát
     */
    @Query("SELECT g FROM GiaoDich g WHERE " +
           "LOWER(g.nguoiDung.maNguoiDung) = LOWER(:kw) OR " +
           "g.nguoiDung.sdt = :kw OR " +
           "LOWER(g.nguoiDung.email) = LOWER(:kw) OR " +
           "LOWER(g.nguoiDung.tenDangNhap) = LOWER(:kw) OR " +
           "LOWER(g.nguoiDung.hoVaTen) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "g.nguoiDung.cccd = :kw OR " +
           "LOWER(g.maGiaoDich) = LOWER(:kw) " +
           "ORDER BY g.ngayGiaoDich DESC")
    List<GiaoDich> searchAllTransactionsByUserInfo(@Param("kw") String keyword);

    @Query("SELECT g FROM GiaoDich g WHERE (" +
           "LOWER(g.nguoiDung.maNguoiDung) = LOWER(:kw) OR " +
           "g.nguoiDung.sdt = :kw OR " +
           "LOWER(g.nguoiDung.email) = LOWER(:kw) OR " +
           "LOWER(g.nguoiDung.tenDangNhap) = LOWER(:kw) OR " +
           "LOWER(g.maGiaoDich) = LOWER(:kw)) " +
           "ORDER BY g.ngayGiaoDich DESC")
    Page<GiaoDich> searchByUserInfo(@Param("kw") String keyword, Pageable pageable);

    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g WHERE g.trangThai = :trangThai")
    Long sumSoTienByTrangThai(@Param("trangThai") TrangThaiGD trangThai);

    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g WHERE g.loaiGiaoDich = :loaiGiaoDich AND g.trangThai = :trangThai")
    Long sumSoTienByLoaiAndTrangThai(@Param("loaiGiaoDich") String loaiGiaoDich, @Param("trangThai") TrangThaiGD trangThai);

    long countByLoaiGiaoDichAndTrangThai(String loaiGiaoDich, TrangThaiGD trangThai);

    /**
     * Tính tổng số tiền đã thu của một người dùng (loại trừ các loại giao dịch nhất định)
     */
    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g WHERE g.nguoiDung.maNguoiDung = :maNguoiDung AND g.loaiGiaoDich <> :excludeLoai AND g.trangThai = :trangThai")
    Long sumSoTienByNguoiDungAndLoaiGiaoDichNotAndTrangThai(
            @Param("maNguoiDung") String maNguoiDung,
            @Param("excludeLoai") String excludeLoai,
            @Param("trangThai") TrangThaiGD trangThai
    );

    /**
     * Tính tổng số tiền theo loại giao dịch và trạng thái cụ thể của một người dùng (ví dụ: RUT_TIEN + THANH_CONG)
     */
    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g WHERE g.nguoiDung.maNguoiDung = :maNguoiDung AND g.loaiGiaoDich = :loaiGiaoDich AND g.trangThai = :trangThai")
    Long sumSoTienByNguoiDungAndLoaiGiaoDichAndTrangThai(
            @Param("maNguoiDung") String maNguoiDung,
            @Param("loaiGiaoDich") String loaiGiaoDich,
            @Param("trangThai") TrangThaiGD trangThai
    );

    /**
     * Kiểm tra nhanh sự tồn tại của giao dịch nộp cọc cho lịch hẹn xem phòng
     */
    @Query("SELECT COUNT(g) > 0 FROM GiaoDich g WHERE g.nguoiDung.maNguoiDung = :maNguoiDung " +
           "AND g.loaiGiaoDich = 'COC_XEM_PHONG' AND g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.THANH_CONG " +
           "AND g.noiDung LIKE CONCAT('%', :maDatLich, '%')")
    boolean existsDepositByMaDatLich(@Param("maNguoiDung") String maNguoiDung, @Param("maDatLich") String maDatLich);

    @Query("SELECT COUNT(g) > 0 FROM GiaoDich g WHERE g.noiDung LIKE CONCAT('%', :candidateId, '%')")
    boolean existsByCandidateId(@Param("candidateId") String candidateId);

    /**
     * Khóa bi quan (Pessimistic Lock) khi Admin phê duyệt giao dịch để chống race-condition / nhiều Admin duyệt trùng
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM GiaoDich g WHERE g.maGiaoDich = :maGiaoDich")
    Optional<GiaoDich> findByIdForUpdate(@Param("maGiaoDich") String maGiaoDich);
}
