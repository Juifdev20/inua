package com.hospital.backend.repository;

import com.hospital.backend.entity.InventairesPharmacie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventairePharmaRepository extends JpaRepository<InventairesPharmacie, Long> {

    List<InventairesPharmacie> findAllByOrderByDateDescCreatedAtDesc();
}
