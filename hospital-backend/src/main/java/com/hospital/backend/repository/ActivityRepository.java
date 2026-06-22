package com.hospital.backend.repository;

import com.hospital.backend.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    // Récupérer les 5 dernières activités par date décroissante
    List<Activity> findTop5ByOrderByDateDesc();

    // MULTI-TENANT: inclut aussi les activités sans hospital_id (legacy)
    @Query("SELECT a FROM Activity a WHERE a.hospitalId = :hospitalId OR a.hospitalId IS NULL ORDER BY a.date DESC LIMIT 5")
    List<Activity> findTop5ByHospitalIdOrderByDateDesc(@Param("hospitalId") Long hospitalId);
}
