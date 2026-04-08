package com.hospital.backend.repository;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import com.hospital.backend.entity.Role;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    // Cette méthode est très utile pour vérifier si un rôle existe
    // avant de tenter de le créer (évite les doublons)
    Optional<Role> findByNom(String nom);

    // Vous pouvez aussi ajouter une méthode pour supprimer par nom si besoin
    void deleteByNom(String nom);

    // Vérifier si un rôle existe par son nom
    boolean existsByNom(String nom);
}

