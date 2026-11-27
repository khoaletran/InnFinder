/*
 * @ (#) LoaiPhongTroRepository.java    1.0     11/4/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */
package com.innfinder.backend.repository;


import com.innfinder.backend.entity.LoaiPhongTro;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/4/2026 7:04 PM
 */
@Repository
public interface LoaiPhongTroRepository extends JpaRepository<LoaiPhongTro, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM LoaiPhongTro l WHERE l.maLpt = :maLpt")
    Optional<LoaiPhongTro> findByIdForUpdate(@Param("maLpt") String maLpt);
}
