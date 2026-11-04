/*
 * @ (#) LoaiPhongTroRepository.java    1.0     11/4/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */
package com.innfinder.backend.repository;


import com.innfinder.backend.entity.LoaiPhongTro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/4/2026 7:04 PM
 */
@Repository
public interface LoaiPhongTroRepository extends JpaRepository<LoaiPhongTro, String> {
}
