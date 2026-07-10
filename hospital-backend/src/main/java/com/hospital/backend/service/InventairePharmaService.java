package com.hospital.backend.service;

import com.hospital.backend.dto.InventairePharmaDTO;
import com.hospital.backend.dto.LigneInventairePharmaDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.*;
import com.hospital.backend.security.HospitalTenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventairePharmaService {

    private final InventairePharmaRepository inventaireRepository;
    private final LigneInventairePharmaRepository ligneRepository;
    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;
    private final StockMovementRepository stockMovementRepository;
    private final AuditLogService auditLogService;

    // ─────────────────────────────────────────────────────
    // LISTER
    // ─────────────────────────────────────────────────────

    public List<InventairePharmaDTO> listerInventaires() {
        Long hId = HospitalTenantContext.getHospitalId();
        List<InventairesPharmacie> inventaires;
        if (hId != null) {
            inventaires = inventaireRepository.findByAgentHospitalId(hId);
        } else {
            inventaires = inventaireRepository.findAllByOrderByDateDescCreatedAtDesc();
        }
        return inventaires.stream()
                .map(inv -> mapToDTO(inv, false))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────
    // DÉTAIL
    // ─────────────────────────────────────────────────────

    public InventairePharmaDTO obtenirDetail(Long id) {
        InventairesPharmacie inv = inventaireRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventaire introuvable"));
        return mapToDTO(inv, true);
    }

    // ─────────────────────────────────────────────────────
    // CRÉER (transaction atomique)
    // ─────────────────────────────────────────────────────

    @Transactional
    public InventairePharmaDTO creerInventaire(InventairePharmaDTO.CreerRequest request, Long agentId) {
        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent introuvable"));

        List<Medication> medicaments = getMedicamentsParType(request.getType());
        if (medicaments.isEmpty()) {
            throw new RuntimeException("Aucun médicament actif dans la base");
        }

        InventairesPharmacie inventaire = InventairesPharmacie.builder()
                .date(LocalDate.now())
                .type(request.getType())
                .statut(InventaireStatut.EN_COURS)
                .agent(agent)
                .observations(request.getObservations())
                .build();
        inventaire = inventaireRepository.save(inventaire);

        for (Medication med : medicaments) {
            BigDecimal stockTheorique = med.getStockQuantity() != null
                    ? BigDecimal.valueOf(med.getStockQuantity()) : BigDecimal.ZERO;
            BigDecimal prixAchat = med.getPrice() != null ? med.getPrice() : BigDecimal.ZERO;
            BigDecimal ecart = stockTheorique.negate();
            BigDecimal valeurEcart = ecart.multiply(prixAchat);

            LigneInventairePharmacieEntity ligne = LigneInventairePharmacieEntity.builder()
                    .inventaire(inventaire)
                    .medicament(med)
                    .stockTheorique(stockTheorique)
                    .stockPhysique(BigDecimal.ZERO)
                    .ecart(ecart)
                    .valeurEcart(valeurEcart)
                    .build();
            ligneRepository.save(ligne);
        }

        auditLogService.logAction(
                "CREATE_INVENTAIRE_PHARMACIE",
                agent.getUsername(),
                "INVENTAIRE-" + inventaire.getId(),
                "{\"type\":\"" + request.getType() + "\",\"nb_lignes\":" + medicaments.size() + "}",
                "PHARMACIE",
                null
        );

        log.info("✅ Inventaire {} créé avec {} lignes", inventaire.getId(), medicaments.size());
        return mapToDTO(inventaire, true);
    }

    // ─────────────────────────────────────────────────────
    // METTRE À JOUR LES LIGNES
    // ─────────────────────────────────────────────────────

    @Transactional
    public InventairePharmaDTO mettreAJourLignes(Long inventaireId, InventairePharmaDTO.MajLignesRequest request) {
        InventairesPharmacie inventaire = inventaireRepository.findById(inventaireId)
                .orElseThrow(() -> new RuntimeException("Inventaire introuvable"));

        if (inventaire.getStatut() != InventaireStatut.EN_COURS) {
            throw new RuntimeException("Seul un inventaire en cours peut être modifié");
        }

        for (LigneInventairePharmaDTO.MajLigneRequest maj : request.getLignes()) {
            LigneInventairePharmacieEntity ligne = ligneRepository.findById(maj.getLigneId())
                    .orElseThrow(() -> new RuntimeException("Ligne introuvable: " + maj.getLigneId()));

            if (maj.getStockPhysique() != null && maj.getStockPhysique().compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("Le stock physique ne peut pas être négatif");
            }

            BigDecimal stockPhysique = maj.getStockPhysique() != null ? maj.getStockPhysique() : ligne.getStockPhysique();
            BigDecimal ecart = stockPhysique.subtract(ligne.getStockTheorique());
            BigDecimal prixAchat = ligne.getMedicament().getPrice() != null ? ligne.getMedicament().getPrice() : BigDecimal.ZERO;
            BigDecimal valeurEcart = ecart.multiply(prixAchat);

            ligne.setStockPhysique(stockPhysique);
            ligne.setEcart(ecart);
            ligne.setValeurEcart(valeurEcart);
            if (maj.getObservation() != null) {
                ligne.setObservation(maj.getObservation());
            }
            ligneRepository.save(ligne);
        }

        return mapToDTO(inventaire, true);
    }

    // ─────────────────────────────────────────────────────
    // SOUMETTRE
    // ─────────────────────────────────────────────────────

    @Transactional
    public InventairePharmaDTO soumettre(Long inventaireId, Long agentId) {
        InventairesPharmacie inventaire = inventaireRepository.findById(inventaireId)
                .orElseThrow(() -> new RuntimeException("Inventaire introuvable"));

        if (inventaire.getStatut() != InventaireStatut.EN_COURS) {
            throw new RuntimeException("Seul un inventaire en cours peut être soumis");
        }

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent introuvable"));

        inventaire.setStatut(InventaireStatut.SOUMIS);
        inventaireRepository.save(inventaire);

        auditLogService.logAction(
                "SOUMISSION_INVENTAIRE_PHARMACIE",
                agent.getUsername(),
                "INVENTAIRE-" + inventaireId,
                "{\"inventaire_id\":" + inventaireId + "}",
                "PHARMACIE",
                null
        );

        log.info("✅ Inventaire {} soumis pour approbation", inventaireId);
        return mapToDTO(inventaire, true);
    }

    // ─────────────────────────────────────────────────────
    // APPROUVER & AJUSTER LE STOCK (transaction atomique)
    // ─────────────────────────────────────────────────────

    @Transactional
    public InventairePharmaDTO approuver(Long inventaireId, Long pharmacienChefId) {
        InventairesPharmacie inventaire = inventaireRepository.findById(inventaireId)
                .orElseThrow(() -> new RuntimeException("Inventaire introuvable"));

        if (inventaire.getStatut() != InventaireStatut.SOUMIS
                && inventaire.getStatut() != InventaireStatut.EN_COURS) {
            throw new RuntimeException("Cet inventaire ne peut pas être clôturé");
        }

        User chef = userRepository.findById(pharmacienChefId)
                .orElseThrow(() -> new RuntimeException("Pharmacien chef introuvable"));

        List<LigneInventairePharmacieEntity> lignes = ligneRepository.findByInventaireId(inventaireId);
        int nbAjustements = 0;
        BigDecimal valeurTotaleEcart = BigDecimal.ZERO;

        for (LigneInventairePharmacieEntity ligne : lignes) {
            if (ligne.getEcart().compareTo(BigDecimal.ZERO) != 0) {
                Medication med = ligne.getMedicament();
                int stockAvant = med.getStockQuantity() != null ? med.getStockQuantity() : 0;
                int stockApres = ligne.getStockPhysique().intValue();

                med.setStockQuantity(stockApres);
                medicationRepository.save(med);

                StockMovement mouvement = StockMovement.builder()
                        .medication(med)
                        .quantityChange(Math.abs(ligne.getEcart().intValue()))
                        .previousStock(stockAvant)
                        .newStock(stockApres)
                        .movementType(StockMovement.MovementType.AJUSTEMENT_INVENTAIRE)
                        .referenceId(inventaireId)
                        .referenceType("INVENTAIRE")
                        .notes("Ajustement inventaire pharmacie INV-" + inventaireId)
                        .createdBy(chef)
                        .status(StockMovement.MovementStatus.VALIDE)
                        .build();
                stockMovementRepository.save(mouvement);

                nbAjustements++;
                valeurTotaleEcart = valeurTotaleEcart.add(ligne.getValeurEcart().abs());
            }
        }

        inventaire.setStatut(InventaireStatut.APPROUVE);
        inventaire.setDateApprobation(LocalDateTime.now());
        inventaire.setPharmacienChef(chef);
        inventaireRepository.save(inventaire);

        auditLogService.logAction(
                "APPROBATION_INVENTAIRE_PHARMACIE",
                chef.getUsername(),
                "INVENTAIRE-" + inventaireId,
                "{\"inventaire_id\":" + inventaireId + ",\"nb_ajustements\":" + nbAjustements + ",\"valeur_totale_ecart\":" + valeurTotaleEcart + "}",
                "PHARMACIE",
                null
        );

        log.info("✅ Inventaire {} approuvé — {} ajustements stock", inventaireId, nbAjustements);
        return mapToDTO(inventaire, true);
    }

    // ─────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────

    private List<Medication> getMedicamentsParType(TypeInventaire type) {
        List<Medication> medicaments;
        switch (type) {
            case QUOTIDIEN:
                medicaments = medicationRepository.findByIsActiveTrueAndCategorieAbc(CategorieAbc.A);
                break;
            case HEBDO:
                medicaments = medicationRepository.findByIsActiveTrueAndCategorieAbcIn(
                        Arrays.asList(CategorieAbc.A, CategorieAbc.B));
                break;
            default:
                medicaments = medicationRepository.findByIsActiveTrue();
                break;
        }
        if (medicaments.isEmpty()) {
            medicaments = medicationRepository.findByIsActiveTrue();
        }
        // 🏥 MULTI-TENANT : ne compter que les médicaments de l'hôpital courant
        Long hId = HospitalTenantContext.getHospitalId();
        if (hId != null) {
            medicaments = medicaments.stream()
                    .filter(m -> m.getHospital() != null && m.getHospital().getId().equals(hId))
                    .collect(java.util.stream.Collectors.toList());
        }
        return medicaments;
    }

    private InventairePharmaDTO mapToDTO(InventairesPharmacie inv, boolean avecLignes) {
        InventairePharmaDTO dto = InventairePharmaDTO.builder()
                .id(inv.getId())
                .date(inv.getDate())
                .type(inv.getType())
                .statut(inv.getStatut())
                .observations(inv.getObservations())
                .dateApprobation(inv.getDateApprobation())
                .build();

        if (inv.getAgent() != null) {
            dto.setAgentId(inv.getAgent().getId());
            dto.setAgentNom(inv.getAgent().getLastName());
            dto.setAgentPrenom(inv.getAgent().getFirstName());
        }

        if (inv.getPharmacienChef() != null) {
            dto.setPharmacienChefId(inv.getPharmacienChef().getId());
            dto.setPharmacienChefNom(inv.getPharmacienChef().getLastName());
            dto.setPharmacienChefPrenom(inv.getPharmacienChef().getFirstName());
        }

        if (avecLignes) {
            List<LigneInventairePharmacieEntity> lignes = ligneRepository.findByInventaireId(inv.getId());
            dto.setNbLignes(lignes.size());
            dto.setLignes(lignes.stream().map(this::mapLigneToDTO).collect(Collectors.toList()));
        } else {
            List<LigneInventairePharmacieEntity> lignes = ligneRepository.findByInventaireId(inv.getId());
            dto.setNbLignes(lignes.size());
        }

        return dto;
    }

    private LigneInventairePharmaDTO mapLigneToDTO(LigneInventairePharmacieEntity ligne) {
        Medication med = ligne.getMedicament();
        return LigneInventairePharmaDTO.builder()
                .id(ligne.getId())
                .inventaireId(ligne.getInventaire() != null ? ligne.getInventaire().getId() : null)
                .medicamentId(med.getId())
                .medicamentNom(med.getName())
                .codeDci(med.getMedicationCode())
                .forme(med.getForm() != null ? med.getForm().getDisplayName() : null)
                .dosage(med.getStrength())
                .unite(med.getCategory())
                .prixAchat(med.getPrice())
                .stockTheorique(ligne.getStockTheorique())
                .stockPhysique(ligne.getStockPhysique())
                .ecart(ligne.getEcart())
                .valeurEcart(ligne.getValeurEcart())
                .observation(ligne.getObservation())
                .build();
    }
}
