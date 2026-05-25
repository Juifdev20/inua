package com.hospital.backend.service.impl;

import com.hospital.backend.dto.MedicationDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.MedicationRepository;
import com.hospital.backend.repository.StockMovementRepository;
import com.hospital.backend.service.MedicationService;
import com.hospital.backend.service.PharmacieFinanceIntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicationServiceImpl implements MedicationService {
    
    private final MedicationRepository medicationRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PharmacieFinanceIntegrationService pharmacieFinanceIntegrationService;
    private final com.hospital.backend.repository.UserRepository userRepository;
    
    @Override
    @Transactional
    public MedicationDTO create(MedicationDTO dto) {
        log.info("Création d'un nouveau médicament: {}", dto.getName());
        
        if (medicationRepository.findByName(dto.getName()).isPresent()) {
            throw new BadRequestException("Un médicament avec ce nom existe déjà");
        }
        
        Medication medication = mapToEntity(dto);
        medication = medicationRepository.save(medication);
        log.info("Médicament créé avec le code: {}", medication.getMedicationCode());
        
        return mapToDTO(medication);
    }
    
    @Override
    @Transactional
    public MedicationDTO update(Long id, MedicationDTO dto) {
        log.info("Mise à jour du médicament ID: {}", id);
        
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        
        updateEntity(medication, dto);
        medication = medicationRepository.save(medication);
        
        return mapToDTO(medication);
    }
    
    @Override
    public MedicationDTO getById(Long id) {
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        return mapToDTO(medication);
    }
    
    @Override
    public MedicationDTO getByCode(String code) {
        Medication medication = medicationRepository.findByMedicationCode(code)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        return mapToDTO(medication);
    }
    
    @Override
    public PageResponse<MedicationDTO> getAll(Pageable pageable) {
        Page<Medication> page = medicationRepository.findByIsActiveTrue(pageable);
        return toPageResponse(page);
    }
    
    @Override
    public PageResponse<MedicationDTO> search(String query, Pageable pageable) {
        Page<Medication> page = medicationRepository.searchMedications(query, pageable);
        return toPageResponse(page);
    }
    
    @Override
    public List<MedicationDTO> getLowStockMedications() {
        return medicationRepository.findLowStockMedications().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Override
    public List<MedicationDTO> getExpiredMedications() {
        return medicationRepository.findExpiredMedications().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Override
    @Transactional
    public MedicationDTO updateStock(Long id, Integer quantity) {
        log.info("Mise à jour du stock du médicament ID: {} avec quantité: {}", id, quantity);
        
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        
        int newStock = medication.getStockQuantity() + quantity;
        if (newStock < 0) {
            throw new BadRequestException("Stock insuffisant");
        }
        
        medication.setStockQuantity(newStock);
        medication = medicationRepository.save(medication);
        
        return mapToDTO(medication);
    }
    
    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Suppression du médicament ID: {}", id);
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        medicationRepository.delete(medication);
    }
    
    @Override
    @Transactional
    public void deactivate(Long id) {
        log.info("Désactivation du médicament ID: {}", id);
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        medication.setIsActive(false);
        medicationRepository.save(medication);
    }
    
    private Medication mapToEntity(MedicationDTO dto) {
        return Medication.builder()
            .medicationCode(dto.getMedicationCode())
            .name(dto.getName())
            .genericName(dto.getGenericName())
            .description(dto.getDescription())
            .manufacturer(dto.getManufacturer())
            .supplier(dto.getSupplier())
            .category(dto.getCategory())
            .form(dto.getForm())
            .strength(dto.getStrength())
            .price(dto.getPrice())
            .purchaseCurrency(dto.getPurchaseCurrency() != null ? dto.getPurchaseCurrency() : dto.getDevise())
            .unitPrice(dto.getUnitPrice())
            .saleCurrency(dto.getSaleCurrency())
            .stockQuantity(dto.getStockQuantity() != null ? dto.getStockQuantity() : 0)
            .minimumStock(dto.getMinimumStock() != null ? dto.getMinimumStock() : 10)
            .expiryDate(dto.getExpiryDate())
            .purchaseDate(dto.getPurchaseDate())
            .joursAvantAlerte(dto.getJoursAvantAlerte() != null ? dto.getJoursAvantAlerte() : 30)
            .isActive(true)
            .requiresPrescription(dto.getRequiresPrescription() != null ? dto.getRequiresPrescription() : true)
            .build();
    }
    
    private void updateEntity(Medication medication, MedicationDTO dto) {
        if (dto.getName() != null) medication.setName(dto.getName());
        if (dto.getGenericName() != null) medication.setGenericName(dto.getGenericName());
        if (dto.getDescription() != null) medication.setDescription(dto.getDescription());
        if (dto.getManufacturer() != null) medication.setManufacturer(dto.getManufacturer());
        if (dto.getSupplier() != null) medication.setSupplier(dto.getSupplier());
        if (dto.getCategory() != null) medication.setCategory(dto.getCategory());
        if (dto.getForm() != null) medication.setForm(dto.getForm());
        if (dto.getStrength() != null) medication.setStrength(dto.getStrength());
        if (dto.getPrice() != null) medication.setPrice(dto.getPrice());
        if (dto.getPurchaseCurrency() != null) medication.setPurchaseCurrency(dto.getPurchaseCurrency());
        if (dto.getDevise() != null && dto.getPurchaseCurrency() == null) medication.setPurchaseCurrency(dto.getDevise());
        if (dto.getUnitPrice() != null) medication.setUnitPrice(dto.getUnitPrice());
        if (dto.getSaleCurrency() != null) medication.setSaleCurrency(dto.getSaleCurrency());
        // 🔧 Ne pas mettre à jour le stock ici si c'est un workflow d'achat (géré séparément)
        if (dto.getStockQuantity() != null && !Boolean.TRUE.equals(dto.getIsStockPurchase())) {
            medication.setStockQuantity(dto.getStockQuantity());
        }
        if (dto.getMinimumStock() != null) medication.setMinimumStock(dto.getMinimumStock());
        if (dto.getExpiryDate() != null) medication.setExpiryDate(dto.getExpiryDate());
        if (dto.getPurchaseDate() != null) medication.setPurchaseDate(dto.getPurchaseDate());
        if (dto.getRequiresPrescription() != null) medication.setRequiresPrescription(dto.getRequiresPrescription());
        if (dto.getJoursAvantAlerte() != null) medication.setJoursAvantAlerte(dto.getJoursAvantAlerte());
    }
    
    private MedicationDTO mapToDTO(Medication m) {
        // 🔍 DEBUG LOG - Vérification des valeurs brutes de la base de données
        log.info("🔍 DEBUG mapToDTO - Médicament: {}", m.getName());
        log.info("  - price: {} (type: {})", m.getPrice(), m.getPrice() != null ? m.getPrice().getClass().getSimpleName() : "null");
        log.info("  - unitPrice: {} (type: {})", m.getUnitPrice(), m.getUnitPrice() != null ? m.getUnitPrice().getClass().getSimpleName() : "null");
        log.info("  - stockQuantity: {} (type: {})", m.getStockQuantity(), m.getStockQuantity() != null ? m.getStockQuantity().getClass().getSimpleName() : "null");
        
        return MedicationDTO.builder()
            .id(m.getId())
            .medicationCode(m.getMedicationCode())
            .name(m.getName())
            .genericName(m.getGenericName())
            .description(m.getDescription())
            .manufacturer(m.getManufacturer())
            .supplier(m.getSupplier())
            .category(m.getCategory())
            .form(m.getForm())
            .strength(m.getStrength())
            .price(m.getPrice())
            .purchaseCurrency(m.getPurchaseCurrency())
            .unitPrice(m.getUnitPrice())
            .saleCurrency(m.getSaleCurrency())
            .stockQuantity(m.getStockQuantity())
            .minimumStock(m.getMinimumStock())
            .joursAvantAlerte(m.getJoursAvantAlerte())
            .expiryDate(m.getExpiryDate())
            .purchaseDate(m.getPurchaseDate())
            .devise(m.getPurchaseCurrency())  // Pour compatibilité
            .isActive(m.getIsActive())
            .requiresPrescription(m.getRequiresPrescription())
            .createdAt(m.getCreatedAt())
            .updatedAt(m.getUpdatedAt())
            .build();
    }
    
    private PageResponse<MedicationDTO> toPageResponse(Page<Medication> page) {
        return PageResponse.<MedicationDTO>builder()
            .content(page.getContent().stream().map(this::mapToDTO).toList())
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .first(page.isFirst())
            .last(page.isLast())
            .build();
    }
    
    // Implémentation des méthodes d'inventaire pharmacie
    
    @Override
    @Transactional
    public MedicationDTO saveMedication(MedicationDTO medicationDTO) {
        log.info("Sauvegarde d'un médicament dans l'inventaire: {}", medicationDTO.getName());
        
        // Validation des champs obligatoires
        if (medicationDTO.getName() == null || medicationDTO.getName().trim().isEmpty()) {
            throw new BadRequestException("Le nom du médicament est obligatoire");
        }
        // Générer un code automatique si non fourni
        if (medicationDTO.getMedicationCode() == null || medicationDTO.getMedicationCode().trim().isEmpty()) {
            String autoCode;
            do {
                autoCode = "MED-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            } while (medicationRepository.findByMedicationCode(autoCode).isPresent());
            medicationDTO.setMedicationCode(autoCode);
            log.info("🔑 Code médicament auto-généré: {}", autoCode);
        }

        // Vérifier si le médicament existe déjà par code
        if (medicationRepository.findByMedicationCode(medicationDTO.getMedicationCode()).isPresent()) {
            throw new BadRequestException("Un médicament avec ce code existe déjà");
        }
        
        Medication medication = mapToEntity(medicationDTO);
        medication = medicationRepository.save(medication);
        log.info("Médicament sauvegardé avec l'ID: {}", medication.getId());
        
        return mapToDTO(medication);
    }
    
    @Override
    @Transactional
    public MedicationDTO updateMedication(Long id, MedicationDTO dto) {
        log.info("Mise à jour du médicament ID: {}", id);
        
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        
        // 🔧 WORKFLOW D'ACHAT AVEC VALIDATION FINANCE
        // Si c'est un achat (isStockPurchase=true), on ne met pas à jour le stock immédiatement
        // On crée une transaction finance en attente et un mouvement de stock en attente
        if (Boolean.TRUE.equals(dto.getIsStockPurchase()) && dto.getQuantityAdded() != null && dto.getQuantityAdded() > 0) {
            log.info("🛒 Achat détecté - Création transaction finance en attente pour médicament: {}", medication.getName());
            
            // Récupérer l'utilisateur courant (createdBy)
            User createdBy = null;
            if (dto.getCreatedById() != null) {
                createdBy = userRepository.findById(dto.getCreatedById()).orElse(null);
            }
            
            // 1. Créer la transaction finance en attente
            com.hospital.backend.dto.ReceptionCommandeDTO reception = new com.hospital.backend.dto.ReceptionCommandeDTO();
            reception.setCommandeId(null); // Achat direct, pas lié à une commande
            reception.setTotal(BigDecimal.valueOf(dto.getQuantityAdded()).multiply(
                dto.getPrice() != null ? dto.getPrice() : medication.getPrice() != null ? medication.getPrice() : BigDecimal.ZERO
            ));
            reception.setDevise(dto.getPurchaseCurrency() != null ? dto.getPurchaseCurrency() : medication.getPurchaseCurrency());
            reception.setNumeroFactureFournisseur(dto.getLotNumber()); // Utilisé comme numéro de facture
            reception.setFournisseurNom(dto.getSupplier() != null ? dto.getSupplier() : medication.getSupplier());
            reception.setJustificatifUrl(dto.getJustificatifUrl());
            
            FinanceTransaction transaction = pharmacieFinanceIntegrationService.onReceptionCommandeValidee(reception, createdBy);
            log.info("💰 Transaction finance créée ID: {} - Statut: EN_ATTENTE_SCAN", transaction.getId());
            
            // 2. Créer le mouvement de stock EN ATTENTE (sans modifier le stock)
            StockMovement movement = StockMovement.builder()
                .medication(medication)
                .quantityChange(dto.getQuantityAdded()) // Positif car entrée
                .previousStock(medication.getStockQuantity()) // Stock actuel (pas encore modifié)
                .newStock(medication.getStockQuantity()) // Même valeur car pas encore validé
                .movementType(StockMovement.MovementType.ENTREE_ACHAT)
                .status(StockMovement.MovementStatus.EN_ATTENTE_VALIDATION)
                .financeTransactionId(transaction.getId()) // Lien vers la transaction
                .notes("Achat en attente validation finance - Fournisseur: " + (dto.getSupplier() != null ? dto.getSupplier() : medication.getSupplier()) + 
                       ", Quantité: " + dto.getQuantityAdded() + ", Motif: " + dto.getMotif())
                .createdBy(createdBy)
                .build();
            
            stockMovementRepository.save(movement);
            log.info("📦 Mouvement de stock créé en attente ID: {} - Stock inchangé: {}", movement.getId(), medication.getStockQuantity());
            
            // 3. Mettre à jour les autres champs du médicament (sauf le stock!)
            // On sauvegarde le fournisseur, prix, etc. mais PAS la quantité
            updateEntityForPurchase(medication, dto);
            medication = medicationRepository.save(medication);
            
            log.info("✅ Médicament mis à jour (sans stock) - Transaction finance ID: {} en attente de validation", transaction.getId());
            return mapToDTO(medication);
        }
        
        // 🔧 SORTIE DE STOCK (REMOVE) - On peut mettre à jour immédiatement
        if ("REMOVE".equals(dto.getStockAction()) && dto.getQuantityRemoved() != null && dto.getQuantityRemoved() > 0) {
            log.info("📤 Sortie de stock détectée - Médicament: {}, Quantité: {}", medication.getName(), dto.getQuantityRemoved());
            
            int previousStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
            int newStock = previousStock - dto.getQuantityRemoved();
            
            if (newStock < 0) {
                throw new BadRequestException("Stock insuffisant pour le retrait. Stock actuel: " + previousStock + ", Quantité demandée: " + dto.getQuantityRemoved());
            }
            
            // Créer le mouvement de stock
            User createdBy = null;
            if (dto.getCreatedById() != null) {
                createdBy = userRepository.findById(dto.getCreatedById()).orElse(null);
            }
            
            StockMovement movement = StockMovement.builder()
                .medication(medication)
                .quantityChange(-dto.getQuantityRemoved())
                .previousStock(previousStock)
                .newStock(newStock)
                .movementType(StockMovement.MovementType.SORTIE_MANUELLE)
                .status(StockMovement.MovementStatus.VALIDE)
                .notes("Retrait manuel - Motif: " + dto.getMotif())
                .createdBy(createdBy)
                .build();
            
            stockMovementRepository.save(movement);
            
            // Mettre à jour le stock
            medication.setStockQuantity(newStock);
            log.info("📦 Stock mis à jour: {} → {}", previousStock, newStock);
        }
        
        // Mise à jour standard (autres champs)
        updateEntity(medication, dto);
        medication = medicationRepository.save(medication);
        
        return mapToDTO(medication);
    }
    
    /**
     * Met à jour les champs du médicament pour un achat (sans toucher au stock)
     */
    private void updateEntityForPurchase(Medication medication, MedicationDTO dto) {
        if (dto.getPrice() != null) medication.setPrice(dto.getPrice());
        if (dto.getPurchaseCurrency() != null) medication.setPurchaseCurrency(dto.getPurchaseCurrency());
        if (dto.getSupplier() != null) medication.setSupplier(dto.getSupplier());
        if (dto.getPurchaseDate() != null) medication.setPurchaseDate(dto.getPurchaseDate());
        if (dto.getExpiryDate() != null) medication.setExpiryDate(dto.getExpiryDate());
        if (dto.getJoursAvantAlerte() != null) medication.setJoursAvantAlerte(dto.getJoursAvantAlerte());
        if (dto.getLotNumber() != null) {
            // Le numéro de lot peut être stocké dans les notes ou créer une nouvelle entité Lot si nécessaire
        }
    }
    
    @Override
    @Transactional
    public void deleteMedication(Long id) {
        log.info("Suppression du médicament ID: {}", id);
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        medicationRepository.delete(medication);
    }
    
    @Override
    public List<MedicationDTO> getAllMedications() {
        return medicationRepository.findByIsActiveTrue().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Override
    public MedicationDTO getMedicationById(Long id) {
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        return mapToDTO(medication);
    }
    
    @Override
    public MedicationDTO findByName(String name) {
        Medication medication = medicationRepository.findByName(name)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        return mapToDTO(medication);
    }
}
