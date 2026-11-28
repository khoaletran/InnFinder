package com.innfinder.backend.repository;

import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GiaoDichRepository extends JpaRepository<GiaoDich, String>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<GiaoDich> {
    @Query("SELECT MAX(g.maGiaoDich) FROM GiaoDich g WHERE g.maGiaoDich LIKE CONCAT(:prefix, '%')")
    String findMaxMaGiaoDichByPrefix(@Param("prefix") String prefix);

    /**
     * Lấy toàn bộ lịch sử giao dịch (nạp/giữ cọc/hoàn tiền) của một người dùng
     * Sắp xếp theo thời gian giao dịch mới nhất lên đầu
     * Dùng cho endpoint: GET /api/transactions/my-history
     */
    List<GiaoDich> findByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(String nguoiDungMaNguoiDung);

    @Override
    @EntityGraph(attributePaths = {"nguoiDung"})
    Page<GiaoDich> findAll(Specification<GiaoDich> spec, Pageable pageable);

    /**
     * Lấy danh sách giao dịch theo trạng thái (ví dụ: CHO_THANH_TOAN để phục vụ duyệt/chờ xử lý)
     */
    List<GiaoDich> findByTrangThaiOrderByNgayGiaoDichDesc(TrangThaiGD trangThai);

    Page<GiaoDich> findByTrangThaiOrderByNgayGiaoDichDesc(TrangThaiGD trangThai, Pageable pageable);

    /**
     * Khi người dùng có thắc mắc, cung cấp thông tin cá nhân (SĐT, Email, Tên đăng nhập, Họ tên, CCCD, Mã người dùng hoặc Mã GD)
     * Admin tìm kiếm sẽ lấy TOÀN BỘ lịch sử giao dịch của người đó để đối soát
     */
    @Query("SELECT g FROM GiaoDich g WHERE (" +
           "LOWER(g.nguoiDung.maNguoiDung) = LOWER(:kw) OR " +
           "g.nguoiDung.sdt = :kw OR " +
           "LOWER(g.nguoiDung.email) = LOWER(:kw) OR " +
           "LOWER(g.nguoiDung.tenDangNhap) = LOWER(:kw) OR " +
           "LOWER(g.maGiaoDich) = LOWER(:kw)) " +
           "ORDER BY g.ngayGiaoDich DESC")
    Page<GiaoDich> searchByUserInfo(@Param("kw") String keyword, Pageable pageable);

    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g WHERE g.loaiGiaoDich = :loaiGiaoDich AND g.trangThai = :trangThai")
    Long sumSoTienByLoaiAndTrangThai(@Param("loaiGiaoDich") String loaiGiaoDich, @Param("trangThai") TrangThaiGD trangThai);

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

    @Query("SELECT g FROM GiaoDich g WHERE g.nguoiDung.maNguoiDung = :maNguoiDung " +
           "AND g.loaiGiaoDich = 'HOAN_COC' AND g.noiDung LIKE CONCAT('%', :maDatLich, '%') ORDER BY g.ngayGiaoDich DESC")
    List<GiaoDich> findRefundTransactions(@Param("maNguoiDung") String maNguoiDung, @Param("maDatLich") String maDatLich);

    @Query("SELECT g.noiDung FROM GiaoDich g WHERE g.nguoiDung.maNguoiDung = :maNguoiDung " +
           "AND g.loaiGiaoDich = 'COC_XEM_PHONG' AND g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.THANH_CONG")
    List<String> findSuccessfulDepositContentsByUserId(@Param("maNguoiDung") String maNguoiDung);

    @Query("SELECT g FROM GiaoDich g JOIN FETCH g.nguoiDung WHERE g.nguoiDung.maNguoiDung IN :userIds " +
           "AND g.loaiGiaoDich = 'COC_XEM_PHONG' AND g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.THANH_CONG")
    List<GiaoDich> findSuccessfulDepositsByUserIds(@Param("userIds") List<String> userIds);

    @Query("SELECT g FROM GiaoDich g WHERE g.nguoiDung.maNguoiDung = :maNguoiDung " +
           "AND g.loaiGiaoDich = 'HOAN_COC' ORDER BY g.ngayGiaoDich DESC")
    List<GiaoDich> findAllRefundTransactionsByUserId(@Param("maNguoiDung") String maNguoiDung);

    @Query("SELECT COUNT(g) > 0 FROM GiaoDich g WHERE g.noiDung LIKE CONCAT('%', :candidateId, '%')")
    boolean existsByCandidateId(@Param("candidateId") String candidateId);

    boolean existsByMaThamChieuNganHang(String maThamChieuNganHang);

    boolean existsByNoiDungContaining(String marker);

    /**
     * Khóa bi quan (Pessimistic Lock) khi Admin phê duyệt giao dịch để chống race-condition / nhiều Admin duyệt trùng
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM GiaoDich g WHERE g.maGiaoDich = :maGiaoDich")
    Optional<GiaoDich> findByIdForUpdate(@Param("maGiaoDich") String maGiaoDich);
    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g WHERE g.nguoiDung.maNguoiDung = :userId " +
           "AND g.loaiGiaoDich IN ('CONG_TIEN_COC', 'HOAN_COC', 'HOAN_TIEN_RUT') " +
           "AND g.trangThai IN (com.innfinder.backend.entity.enums.TrangThaiGD.THANH_CONG, " +
           "com.innfinder.backend.entity.enums.TrangThaiGD.HOAN_TIEN)")
    Long sumWalletCredits(@Param("userId") String userId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"nguoiDung"})
    List<GiaoDich> findTop50ByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(String nguoiDungMaNguoiDung);

    @Query("SELECT COALESCE(SUM(g.soTien), 0L) FROM GiaoDich g " +
           "WHERE g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.CHO_THANH_TOAN " +
           "AND g.loaiGiaoDich IN ('HOAN_COC', 'BOI_THUONG_NO_SHOW')")
    Long sumPendingRefundAndNoShow();

    @Query("SELECT g.noiDung FROM GiaoDich g " +
           "WHERE g.loaiGiaoDich = 'COC_XEM_PHONG' " +
           "AND g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.THANH_CONG " +
           "AND g.noiDung IS NOT NULL")
    List<String> findPaidDepositNotes();

    List<GiaoDich> findTop20ByNguoiDung_MaNguoiDungOrderByNgayGiaoDichDesc(String id);

    @Query("SELECT DISTINCT YEAR(g.ngayGiaoDich) FROM GiaoDich g WHERE g.ngayGiaoDich IS NOT NULL")
    List<Integer> findDistinctTransactionYears();

    @Query("""
            SELECT
                COALESCE(SUM(CASE WHEN g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.CHO_THANH_TOAN
                                   AND UPPER(COALESCE(g.loaiGiaoDich, '')) IN ('HOAN_COC', 'BOI_THUONG_NO_SHOW')
                                  THEN COALESCE(g.soTien, 0L) ELSE 0L END), 0L),
                COALESCE(SUM(CASE WHEN UPPER(COALESCE(g.loaiGiaoDich, '')) = 'RUT_TIEN'
                                   AND g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.CHO_THANH_TOAN
                                  THEN COALESCE(g.soTien, 0L) ELSE 0L END), 0L),
                COALESCE(SUM(CASE WHEN UPPER(COALESCE(g.loaiGiaoDich, '')) = 'RUT_TIEN'
                                   AND g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.CHO_THANH_TOAN
                                  THEN 1L ELSE 0L END), 0L),
                COALESCE(SUM(CASE WHEN g.trangThai = com.innfinder.backend.entity.enums.TrangThaiGD.THANH_CONG
                                   AND UPPER(COALESCE(g.loaiGiaoDich, '')) IN ('CONG_TIEN_COC', 'HOAN_COC', 'HOAN_TIEN_RUT')
                                  THEN COALESCE(g.soTien, 0L) ELSE 0L END), 0L),
                COALESCE(SUM(CASE WHEN UPPER(COALESCE(g.loaiGiaoDich, '')) = 'RUT_TIEN'
                                   AND g.trangThai IN (
                                       com.innfinder.backend.entity.enums.TrangThaiGD.THANH_CONG,
                                       com.innfinder.backend.entity.enums.TrangThaiGD.CHO_THANH_TOAN,
                                       com.innfinder.backend.entity.enums.TrangThaiGD.THAT_BAI
                                   )
                                  THEN COALESCE(g.soTien, 0L) ELSE 0L END), 0L)
            FROM GiaoDich g
            WHERE (:hasFilter = false OR (
                g.ngayGiaoDich IS NOT NULL
                AND (:year IS NULL OR YEAR(g.ngayGiaoDich) = :year)
                AND (:month IS NULL OR MONTH(g.ngayGiaoDich) = :month)
                AND (:day IS NULL OR DAY(g.ngayGiaoDich) = :day)
            ))
            """)
    List<Object[]> aggregateLedgerStats(
            @Param("hasFilter") boolean hasFilter,
            @Param("day") Integer day,
            @Param("month") Integer month,
            @Param("year") Integer year
    );

    @Query("""
            SELECT g.trangThai, COUNT(g)
            FROM GiaoDich g
            LEFT JOIN g.nguoiDung u
            WHERE (
                :filterType = 'ALL'
                OR (:filterType = 'WITHDRAWAL' AND UPPER(COALESCE(g.loaiGiaoDich, '')) IN ('YEU_CAU_RUT_TIEN', 'RUT_TIEN'))
                OR (:filterType = 'DEPOSIT' AND UPPER(COALESCE(g.loaiGiaoDich, '')) LIKE '%COC%')
            )
            AND (
                :kw IS NULL OR :kw = ''
                OR LOWER(COALESCE(u.maNguoiDung, '')) = LOWER(:kw)
                OR COALESCE(u.sdt, '') = :kw
                OR LOWER(COALESCE(u.email, '')) = LOWER(:kw)
                OR LOWER(COALESCE(u.tenDangNhap, '')) = LOWER(:kw)
                OR LOWER(COALESCE(u.hoVaTen, '')) LIKE LOWER(CONCAT('%', :kw, '%'))
                OR COALESCE(u.cccd, '') = :kw
                OR LOWER(g.maGiaoDich) = LOWER(:kw)
            )
            GROUP BY g.trangThai
            """)
    List<Object[]> countByTrangThaiFiltered(@Param("filterType") String filterType, @Param("kw") String keyword);
}
