package com.hospital.backend.service;

import com.hospital.backend.entity.Examen;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.repository.ExamenRepository;
import com.hospital.backend.repository.HospitalRepository;
import com.hospital.backend.security.HospitalTenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * ★ SERVICE POUR LES EXAMENS DE LABORATOIRE
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExamenService {

    private final ExamenRepository examenRepository;
    private final HospitalRepository hospitalRepository;

    /**
     * Crée un nouvel examen
     */
    @Transactional
    public Examen createExamen(Examen examen) {
        Long hId = HospitalTenantContext.getHospitalId();
        // Vérifier doublon dans le même hôpital (ou globalement si pas de contexte hôpital)
        boolean codeExists = hId != null
            ? examenRepository.existsByCodeAndHospitalId(examen.getCode(), hId)
            : examenRepository.existsByCode(examen.getCode());
        if (codeExists) {
            throw new IllegalArgumentException("Un examen avec ce code existe déjà: " + examen.getCode());
        }
        if (hId != null) {
            hospitalRepository.findById(hId).ifPresent(examen::setHospital);
        }
        log.info("🧪 [EXAMEN SERVICE] Création de l'examen: {} ({})", examen.getNom(), examen.getCode());
        return examenRepository.save(examen);
    }

    /**
     * Met à jour un examen
     */
    @Transactional
    public Examen updateExamen(Long id, Examen examenDetails) {
        Examen examen = examenRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Examen non trouvé: " + id));

        examen.setNom(examenDetails.getNom());
        examen.setDescription(examenDetails.getDescription());
        examen.setPrix(examenDetails.getPrix());
        examen.setUnite(examenDetails.getUnite());
        examen.setValeurMinReference(examenDetails.getValeurMinReference());
        examen.setValeurMaxReference(examenDetails.getValeurMaxReference());
        examen.setCategorie(examenDetails.getCategorie());
        examen.setDelaiResultatHeures(examenDetails.getDelaiResultatHeures());
        examen.setActif(examenDetails.getActif());

        log.info("🧪 [EXAMEN SERVICE] Mise à jour de l'examen ID: {}", id);
        return examenRepository.save(examen);
    }

    /**
     * Récupère tous les examens actifs
     */
    public List<Examen> getAllActiveExamens() {
        Long hId = HospitalTenantContext.getHospitalId();
        if (hId != null) {
            return examenRepository.findByHospitalIdAndActifTrue(hId);
        }
        return examenRepository.findByActifTrue();
    }

    /**
     * ★ Recherche d'examens par nom ou code
     */
    public List<Examen> searchExamens(String query) {
        Long hId = HospitalTenantContext.getHospitalId();
        if (query == null || query.trim().isEmpty()) {
            if (hId != null) {
                return examenRepository.findAllActiveOrderedByHospital(hId);
            }
            return examenRepository.findAllActiveOrdered();
        }
        log.info("🔍 [EXAMEN SERVICE] Recherche: '{}'", query);
        if (hId != null) {
            return examenRepository.searchByNomOrCodeAndHospital(query.trim(), hId);
        }
        return examenRepository.searchByNomOrCode(query.trim());
    }

    /**
     * Récupère un examen par ID
     */
    public Optional<Examen> getExamenById(Long id) {
        return examenRepository.findById(id);
    }

    /**
     * Récupère un examen par code
     */
    public Optional<Examen> getExamenByCode(String code) {
        return examenRepository.findByCode(code);
    }

    /**
     * Récupère les examens par catégorie
     */
    public List<Examen> getExamensByCategorie(String categorie) {
        Long hId = HospitalTenantContext.getHospitalId();
        if (hId != null) {
            return examenRepository.findByHospitalIdAndCategorieAndActifTrue(hId, categorie);
        }
        return examenRepository.findByCategorieAndActifTrue(categorie);
    }

    /**
     * Désactive un examen (soft delete)
     */
    @Transactional
    public void deactivateExamen(Long id) {
        Examen examen = examenRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Examen non trouvé: " + id));
        examen.setActif(false);
        examenRepository.save(examen);
        log.info("🧪 [EXAMEN SERVICE] Examen ID: {} désactivé", id);
    }

    /**
     * Supprime un examen
     */
    @Transactional
    public void deleteExamen(Long id) {
        examenRepository.deleteById(id);
        log.info("🧪 [EXAMEN SERVICE] Examen ID: {} supprimé", id);
    }

    /**
     * Calcule le prix total d'une liste d'examens
     */
    public BigDecimal calculateTotalPrice(List<Long> examenIds) {
        BigDecimal total = BigDecimal.ZERO;
        for (Long id : examenIds) {
            examenRepository.findById(id).ifPresent(examen -> {
                if (examen.getPrix() != null) {
                    total.add(examen.getPrix());
                }
            });
        }
        return total;
    }
}
