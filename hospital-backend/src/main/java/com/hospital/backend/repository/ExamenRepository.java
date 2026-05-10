package com.hospital.backend.repository;

import com.hospital.backend.entity.Examen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ★ REPOSITORY POUR LES EXAMENS DE LABORATOIRE
 */
@Repository
public interface ExamenRepository extends JpaRepository<Examen, Long> {

    /**
     * Recherche par code exact
     */
    Optional<Examen> findByCode(String code);

    /**
     * Recherche par nom exact
     */
    Optional<Examen> findByNom(String nom);

    /**
     * Liste tous les examens actifs
     */
    List<Examen> findByActifTrue();

    /**
     * Recherche par catégorie
     */
    List<Examen> findByCategorieAndActifTrue(String categorie);

    /**
     * ★ Recherche par nom ou code (pour la barre de recherche)
     * Insensible à la casse
     */
    @Query("SELECT e FROM Examen e WHERE e.actif = true AND " +
           "(LOWER(e.nom) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(e.code) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(e.categorie) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY e.nom ASC")
    List<Examen> searchByNomOrCode(@Param("query") String query);

    /**
     * Recherche simple sans paramètre (tous les actifs)
     */
    @Query("SELECT e FROM Examen e WHERE e.actif = true ORDER BY e.nom ASC")
    List<Examen> findAllActiveOrdered();

    /**
     * Vérifie si un code existe déjà
     */
    boolean existsByCode(String code);

    /**
     * Compte les examens par catégorie
     */
    @Query("SELECT e.categorie, COUNT(e) FROM Examen e WHERE e.actif = true GROUP BY e.categorie")
    List<Object[]> countByCategorie();

    /**
     * ★ Recherche par service ID (pour récupérer les valeurs de référence)
     */
    Optional<Examen> findByServiceId(Long serviceId);
}
