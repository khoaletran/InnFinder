/*
 * @ (#) ChuTroRepository.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */
package com.innfinder.backend.repository;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:31 PM
 */
import com.innfinder.backend.entity.ChuTro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface ChuTroRepository extends JpaRepository<ChuTro, String> {
    Optional<ChuTro> findByNguoiDung_TenDangNhap(String tenDangNhap);
}