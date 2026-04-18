package com.hospital.backend.repository;

import com.hospital.backend.entity.Caisse;
import com.hospital.backend.entity.Currency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository pour les caisses
 */
@Repository
public interface CaisseRepository extends JpaRepository<Caisse, Long> {

    /**
     * Trouve une caisse par nom exact
     */
    Optional<Caisse> findByNom(String nom);

    /**
     * Liste les caisses actives par devise
     */
    List<Caisse> findByDeviseAndActiveTrue(Currency devise);

    /**
     * Liste toutes les caisses actives
     */
    List<Caisse> findByActiveTrue();

    /**
     * Vérifie si un nom de caisse existe déjà
     */
    boolean existsByNom(String nom);
}
