/*
 * @ (#) ChuTroRepository.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */
package com.innfinder.backend.repository;

import com.innfinder.backend.entity.ChuTro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChuTroRepository extends JpaRepository<ChuTro, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM ChuTro c WHERE c.maChuTro = :maChuTro")
    Optional<ChuTro> findByIdForUpdate(@Param("maChuTro") String maChuTro);

    Optional<ChuTro> findByNguoiDung_TenDangNhap(String tenDangNhap);

    @Query("SELECT COALESCE(SUM(c.soDu), 0L) FROM ChuTro c")
    Long sumTotalSoDu();
}
