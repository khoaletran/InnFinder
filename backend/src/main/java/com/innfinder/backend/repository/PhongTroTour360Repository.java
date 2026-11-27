package com.innfinder.backend.repository;

import com.innfinder.backend.entity.PhongTroTour360;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhongTroTour360Repository extends JpaRepository<PhongTroTour360, String> {

    Optional<PhongTroTour360> findFirstByPhongTro_MaPhongTroOrderByUpdatedAtDesc(String maPhongTro);

    List<PhongTroTour360> findByChuTro_MaChuTroOrderByUpdatedAtDesc(String maChuTro);
}
