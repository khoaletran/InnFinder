/*
 * @ (#) ChuTroRepository.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */
package com.innfinder.backend.repository;

import com.innfinder.backend.entity.ChuTro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChuTroRepository extends JpaRepository<ChuTro, String> {
    Optional<ChuTro> findByNguoiDung_TenDangNhap(String tenDangNhap);

    @Query("SELECT COALESCE(SUM(c.soDu), 0L) FROM ChuTro c")
    Long sumTotalSoDu();
}
