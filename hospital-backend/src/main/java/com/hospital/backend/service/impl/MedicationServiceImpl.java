package com.hospital.backend.service.impl;

import com.hospital.backend.dto.MedicationDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.Medication;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.MedicationRepository;
import com.hospital.backend.service.MedicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicationServiceImpl implements MedicationService {
    
    private final MedicationRepository medicationRepository;
    
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
        if (dto.getStockQuantity() != null) medication.setStockQuantity(dto.getStockQuantity());
        if (dto.getMinimumStock() != null) medication.setMinimumStock(dto.getMinimumStock());
        if (dto.getExpiryDate() != null) medication.setExpiryDate(dto.getExpiryDate());
        if (dto.getPurchaseDate() != null) medication.setPurchaseDate(dto.getPurchaseDate());
        if (dto.getRequiresPrescription() != null) medication.setRequiresPrescription(dto.getRequiresPrescription());
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
        if (medicationDTO.getMedicationCode() == null || medicationDTO.getMedicationCode().trim().isEmpty()) {
            throw new BadRequestException("Le code du médicament est obligatoire");
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
    public MedicationDTO updateMedication(Long id, MedicationDTO medicationDTO) {
        log.info("Mise à jour du médicament ID: {}", id);
        
        Medication medication = medicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        
        updateEntity(medication, medicationDTO);
        medication = medicationRepository.save(medication);
        
        return mapToDTO(medication);
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
