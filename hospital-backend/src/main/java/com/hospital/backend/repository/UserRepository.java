package com.hospital.backend.repository;

import com.hospital.backend.entity.User;
import com.hospital.backend.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);

    Optional<User> findByEmailOrUsername(String email, String username);

    List<User> findByRole(Role role);

    List<User> findByIsActiveTrue();

    /**
     * ✅ AJOUT INDISPENSABLE : Utilisé par UserServiceImpl pour lister les médecins actifs.
     * Cette signature permet à Spring Data JPA de générer automatiquement le SQL.
     */
    List<User> findByRoleAndIsActiveTrue(Role role);

    Page<User> findByRole(Role role, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role = :role AND u.isActive = true")
    List<User> findActiveUsersByRole(@Param("role") Role role);

    @Query("SELECT u FROM User u WHERE " +
            "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);

    // --- MÉTHODES DE COMPTAGE POUR ADMINCONTROLLER ---

    long countByRole(Role role);

    long countByRoleNom(String roleNom);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role.nom = :roleNom AND u.createdAt >= :startDate")
    long countNewUsersByRoleSince(@Param("roleNom") String roleNom, @Param("startDate") LocalDateTime startDate);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :startDate")
    long countAllNewUsersSince(@Param("startDate") LocalDateTime startDate);
}