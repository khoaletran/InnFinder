/*
 * @ (#) PhongTroRepository.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */
package com.innfinder.backend.repository;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:05 PM
 */
import com.innfinder.backend.entity.PhongTro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface PhongTroRepository extends JpaRepository<PhongTro, String>, JpaSpecificationExecutor<PhongTro> {
    @Override
    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "chuPhongTro"})
    Page<PhongTro> findAll(Specification<PhongTro> spec, Pageable pageable);
    @EntityGraph(attributePaths = {"hinhAnh", "loaiPhong", "dsTienIch", "chuPhongTro", "chuPhongTro.nguoiDung", "dsDanhGia"})
    Optional<PhongTro> findByMaPhongTro(String maPhongTro);
    List<PhongTro> findByChuPhongTro_MaChuTro(String maChuTro);
}