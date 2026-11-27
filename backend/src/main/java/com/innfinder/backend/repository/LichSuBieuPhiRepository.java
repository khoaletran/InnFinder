package com.innfinder.backend.repository;

import com.innfinder.backend.entity.LichSuBieuPhi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LichSuBieuPhiRepository extends JpaRepository<LichSuBieuPhi, Long> {

    List<LichSuBieuPhi> findTop50ByOrderByThoiGianDesc();

    List<LichSuBieuPhi> findTop50ByMaLptOrderByThoiGianDesc(String maLpt);
}
