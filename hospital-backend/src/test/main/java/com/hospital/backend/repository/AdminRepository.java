package com.hospital.backend.repository;

import com.hospital.backend.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {

    // ✅ Trouver un admin par son email (très utile pour la connexion et le profil)
    Optional<Admin> findByEmail(String email);

    // ✅ Vérifier si un email existe déjà avant de mettre à jour le profil
    Boolean existsByEmail(String email);
}