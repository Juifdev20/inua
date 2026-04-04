package com.hospital.backend.repository;

import com.hospital.backend.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    // Récupérer les 5 dernières activités par date décroissante
    List<Activity> findTop5ByOrderByDateDesc();
}