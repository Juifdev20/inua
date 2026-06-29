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


    // ★ MULTI-TENANT: filtré par hôpital (exclut automatiquement les super admins)
    @Query("SELECT u FROM User u WHERE u.hospital.id = :hospitalId AND (u.role.nom <> 'ROLE_SUPERADMIN' AND u.role.nom <> 'SUPERADMIN')")
    List<User> findByHospitalId(@Param("hospitalId") Long hospitalId);
    @Query("SELECT u FROM User u WHERE u.hospital.id = :hospitalId AND u.role = :role AND (u.role.nom <> 'ROLE_SUPERADMIN' AND u.role.nom <> 'SUPERADMIN')")
    List<User> findByHospitalIdAndRole(@Param("hospitalId") Long hospitalId, @Param("role") Role role);
    @Query("SELECT u FROM User u WHERE u.hospital.id = :hospitalId AND u.role = :role AND u.isActive = true AND (u.role.nom <> 'ROLE_SUPERADMIN' AND u.role.nom <> 'SUPERADMIN')")
    List<User> findByHospitalIdAndRoleAndIsActiveTrue(@Param("hospitalId") Long hospitalId, @Param("role") Role role);
    @Query("SELECT COUNT(u) FROM User u WHERE u.hospital.id = :hospitalId AND (u.role.nom <> 'ROLE_SUPERADMIN' AND u.role.nom <> 'SUPERADMIN')")
    long countByHospitalId(@Param("hospitalId") Long hospitalId);

    @Query("SELECT COUNT(u) FROM User u WHERE u.hospital.id = :hospitalId AND u.role = :role AND (u.role.nom <> 'ROLE_SUPERADMIN' AND u.role.nom <> 'SUPERADMIN')")
    long countByHospitalIdAndRole(@Param("hospitalId") Long hospitalId, @Param("role") Role role);

    @Query("SELECT COUNT(u) FROM User u WHERE u.hospital.id = :hospitalId AND u.role.nom = :roleNom AND (u.role.nom <> 'ROLE_SUPERADMIN' AND u.role.nom <> 'SUPERADMIN')")
    long countByHospitalIdAndRoleNom(@Param("hospitalId") Long hospitalId, @Param("roleNom") String roleNom);

    @Query("SELECT COUNT(u) FROM User u WHERE u.hospital.id = :hospitalId AND u.role.nom = :roleNom AND u.createdAt >= :startDate AND (u.role.nom <> 'ROLE_SUPERADMIN' AND u.role.nom <> 'SUPERADMIN')")
    long countNewUsersByRoleAndHospitalSince(@Param("hospitalId") Long hospitalId, @Param("roleNom") String roleNom, @Param("startDate") LocalDateTime startDate);

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByResetToken(String resetToken);

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

    @Query("SELECT COUNT(u) FROM User u WHERE u.hospital.id = :hospitalId AND u.createdAt >= :startDate AND (u.role.nom <> 'ROLE_SUPERADMIN' AND u.role.nom <> 'SUPERADMIN')")
    long countAllNewUsersByHospitalSince(@Param("hospitalId") Long hospitalId, @Param("startDate") LocalDateTime startDate);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :startDate")
    long countAllNewUsersSince(@Param("startDate") LocalDateTime startDate);

    // ★ MÉTHODES POUR OAUTH2 SOCIAL LOGIN

    Optional<User> findByOauthProviderAndOauthId(String oauthProvider, String oauthId);

    boolean existsByOauthProviderAndOauthId(String oauthProvider, String oauthId);

    // ★ MÉTHODES POUR CONNEXION PAR CODE (OTP/MAGIC CODE)

    Optional<User> findByEmailAndLoginCode(String email, String loginCode);

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.loginCode = :code AND u.codeExpiry > CURRENT_TIMESTAMP")
    Optional<User> findValidLoginCode(@Param("email") String email, @Param("code") String code);

    // ★ MÉTHODE POUR CHARGER L'UTILISATEUR AVEC HÔPITAL ET RÔLE (évite LazyInitializationException)
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.hospital LEFT JOIN FETCH u.role WHERE u.username = :username")
    Optional<User> findByUsernameWithHospitalAndRole(@Param("username") String username);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.hospital LEFT JOIN FETCH u.role WHERE u.email = :email")
    Optional<User> findByEmailWithHospitalAndRole(@Param("email") String email);
}
