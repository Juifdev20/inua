package com.hospital.backend.repository;

import com.hospital.backend.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 1. Récupérer toutes les notifications d'un utilisateur triées par date
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    // 2. Récupérer avec pagination
    Page<Notification> findByUserId(Long userId, Pageable pageable);

    // 3. Compter le nombre de notifications non lues (Badge rouge cloche)
    long countByUserIdAndIsReadFalse(Long userId);

    // 4. Récupérer par type (Filtres onglets)
    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, String type);

    // 5. Optionnel : Trouver une notification par son ID de référence (ex: pour éviter les doublons)
    Optional<Notification> findByReferenceId(Long referenceId);

    // --- ACTIONS DE MISE À JOUR ---

    /**
     * Marque toutes les notifications d'un utilisateur comme lues.
     * Utilisation de n.user.id pour pointer correctement vers la relation JPA.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    /**
     * Marque une notification spécifique comme lue.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :id")
    void markAsRead(@Param("id") Long id);
}