package com.hospital.backend.repository;

import com.hospital.backend.entity.LigneInventairePharmacieEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LigneInventairePharmaRepository extends JpaRepository<LigneInventairePharmacieEntity, Long> {

    List<LigneInventairePharmacieEntity> findByInventaireId(Long inventaireId);
}
