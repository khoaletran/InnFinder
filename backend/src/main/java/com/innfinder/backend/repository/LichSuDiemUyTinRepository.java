package com.innfinder.backend.repository;

import com.innfinder.backend.entity.LichSuDiemUyTin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LichSuDiemUyTinRepository extends JpaRepository<LichSuDiemUyTin, Long> {

    List<LichSuDiemUyTin> findTop50ByChuTro_MaChuTroOrderByThoiGianDesc(String maChuTro);

    long countByChuTro_MaChuTroAndLoaiSuKienAndThoiGianAfter(String maChuTro, String loaiSuKien, LocalDateTime since);

    @Query("SELECT COALESCE(SUM(l.bienDong), 0) FROM LichSuDiemUyTin l " +
           "WHERE l.chuTro.maChuTro = :maChuTro AND l.loaiSuKien = :loaiSuKien AND l.thoiGian > :since")
    int sumBienDongSince(
            @Param("maChuTro") String maChuTro,
            @Param("loaiSuKien") String loaiSuKien,
            @Param("since") LocalDateTime since
    );

    @Query("SELECT COUNT(l) > 0 FROM LichSuDiemUyTin l " +
           "WHERE l.chuTro.maChuTro = :maChuTro " +
           "AND (l.bienDong < 0 OR l.loaiSuKien = 'CANH_CAO_NHE') " +
           "AND l.thoiGian > :since")
    boolean hasViolationSince(
            @Param("maChuTro") String maChuTro,
            @Param("since") LocalDateTime since
    );

    boolean existsByChuTro_MaChuTroAndLoaiSuKienAndThoiGianAfter(
            String maChuTro,
            String loaiSuKien,
            LocalDateTime since
    );
}
