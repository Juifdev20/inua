package com.hospital.backend.repository;

import com.hospital.backend.entity.InventairesPharmacie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventairePharmaRepository extends JpaRepository<InventairesPharmacie, Long> {

    List<InventairesPharmacie> findAllByOrderByDateDescCreatedAtDesc();

    // ★ MULTI-TENANT: filtrer par hôpital de l'agent
    @Query("SELECT i FROM InventairesPharmacie i WHERE i.agent.hospital.id = :hospitalId ORDER BY i.date DESC, i.createdAt DESC")
    List<InventairesPharmacie> findByAgentHospitalId(@Param("hospitalId") Long hospitalId);
}
