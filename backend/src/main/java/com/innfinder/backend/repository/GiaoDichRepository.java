package com.innfinder.backend.repository;

import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GiaoDichRepository extends JpaRepository<GiaoDich, String> {

    @Query("SELECT COALESCE(SUM(g.soTien), 0) FROM GiaoDich g WHERE g.trangThai = :trangThai")
    Long sumSoTienByTrangThai(@Param("trangThai") TrangThaiGD trangThai);
}
