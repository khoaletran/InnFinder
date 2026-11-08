package com.innfinder.backend.repository;

import com.innfinder.backend.entity.PhongTroVector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PhongTroVectorRepository extends JpaRepository<PhongTroVector, String> {
}
