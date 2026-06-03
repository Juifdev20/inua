package com.hospital.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Data;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 📝 AuditableEntity - Classe de base pour l'audit automatique JPA
 *
 * Toute entité qui étend cette classe bénéficie automatiquement de :
 * - createdBy       : email/username de l'utilisateur créateur
 * - lastModifiedBy  : email/username du dernier modificateur
 * - createdDate     : date/heure de création
 * - lastModifiedDate: date/heure de dernière modification
 *
 * Usage :
 *   public class MonEntite extends AuditableEntity { ... }
 *
 * NOTE : Vos entités EXISTANTES (User, StockMovement, etc.) qui ont
 * déjà des champs createdAt/createdBy manuels ne sont PAS modifiées.
 * Vous pouvez progressivement migrer les nouvelles entités vers cette base.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Data
public abstract class AuditableEntity {

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 255)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by", length = 255)
    private String lastModifiedBy;

    @CreatedDate
    @Column(name = "created_date", updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    @Column(name = "last_modified_date")
    private LocalDateTime lastModifiedDate;
}
