package com.hospital.backend.service.impl;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.PrescriptionService;
import com.hospital.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionServiceImpl implements PrescriptionService {
    
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final MedicationRepository medicationRepository;
    private final InvoiceService invoiceService;
    
    @Override
    @Transactional
    public PrescriptionDTO create(PrescriptionDTO dto) {
        log.info("Création d'une nouvelle ordonnance pour le patient ID: {}", dto.getPatientId());
        
        Consultation consultation = consultationRepository.findById(dto.getConsultationId())
            .orElseThrow(() -> new ResourceNotFoundException("Consultation non trouvée"));
        
        Patient patient = patientRepository.findById(dto.getPatientId())
            .orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé"));
        
        User doctor = userRepository.findById(dto.getDoctorId())
            .orElseThrow(() -> new ResourceNotFoundException("Médecin non trouvé"));
        
        Prescription prescription = Prescription.builder()
            .consultation(consultation)
            .patient(patient)
            .doctor(doctor)
            .notes(dto.getNotes())
            .status(PrescriptionStatus.EN_ATTENTE)
            .build();
        
        prescription = prescriptionRepository.save(prescription);
        
        // Ajouter les médicaments si présents
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            for (PrescriptionDTO.PrescriptionItemDTO itemDTO : dto.getItems()) {
                Medication medication = medicationRepository.findById(itemDTO.getMedicationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
                
                // Extract numeric value from duration string (e.g., "7 jours" -> 7)
                Integer durationValue = null;
                if (itemDTO.getDuration() != null && !itemDTO.getDuration().trim().isEmpty()) {
                    try {
                        durationValue = Integer.parseInt(itemDTO.getDuration().replaceAll("[^0-9]", ""));
                    } catch (NumberFormatException e) {
                        // Log error but continue with null duration
                        System.err.println("Invalid duration format: " + itemDTO.getDuration());
                    }
                }

                PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .medication(medication)
                    .dosage(itemDTO.getDosage())
                    .frequency(itemDTO.getFrequency())
                    .duration(durationValue)
                    .quantity(itemDTO.getQuantity())
                    .quantityPerDose(itemDTO.getQuantityPerDose())
                    .build();
                
                prescriptionItemRepository.save(item);
            }
        }
        
        return mapToDTO(prescription);
    }
    
    @Override
    @Transactional
    public PrescriptionDTO createPrescription(PrescriptionDTO dto) {
        log.info("🚀🚀🚀 createPrescription APPELÉ! patientId={}, consultationId={}", dto.getPatientId(), dto.getConsultationId());
        System.out.println("🚀🚀🚀 createPrescription APPELÉ! patientId=" + dto.getPatientId() + " consultationId=" + dto.getConsultationId());
        System.out.flush();
        
        // Debug: Vérifier les données reçues du frontend
        log.info("🔍 DTO reçu - patientId: {}", dto.getPatientId());
        log.info("🔍 DTO reçu - consultationId: {}", dto.getConsultationId());
        log.info("🔍 DTO reçu - doctorId: {}", dto.getDoctorId());
        log.info("🔍 DTO reçu - notes: {}", dto.getNotes());
        log.info("🔍 DTO reçu - status: {}", dto.getStatus());
        log.info("🔍 DTO reçu - items: {}", dto.getItems() != null ? dto.getItems().size() + " items" : "null");
        
        if (dto.getConsultationId() == null) {
            log.error("❌ ERREUR: consultationId est null dans le DTO reçu!");
            throw new RuntimeException("consultationId ne peut pas être null");
        }
        
        Patient patient = patientRepository.findById(dto.getPatientId())
            .orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé"));
        
        User doctor = userRepository.findById(dto.getDoctorId())
            .orElseThrow(() -> new ResourceNotFoundException("Médecin non trouvé"));
        
        Consultation consultation = consultationRepository.findById(dto.getConsultationId())
            .orElseThrow(() -> new ResourceNotFoundException("Consultation non trouvée"));
        
        log.info("✅ Consultation trouvée - ID: {}, Patient: {}", consultation.getId(), consultation.getPatient().getFirstName() + " " + consultation.getPatient().getLastName());
        
        Prescription prescription = Prescription.builder()
            .consultation(consultation)
            .patient(patient)
            .doctor(doctor)
            .notes(dto.getNotes())
            .status(PrescriptionStatus.EN_ATTENTE)
            .build();
        
        prescription = prescriptionRepository.save(prescription);
        
        // Ajouter les médicaments
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            log.info("🔍 Traitement de {} médicaments", dto.getItems().size());
            
            for (int i = 0; i < dto.getItems().size(); i++) {
                PrescriptionDTO.PrescriptionItemDTO itemDTO = dto.getItems().get(i);
                
                log.info("🔍 Médicament #{} - medicationId: {}, medicationName: {}", 
                    i + 1, itemDTO.getMedicationId(), itemDTO.getMedicationName());
                
                if (itemDTO.getMedicationId() == null) {
                    log.error("❌ ERREUR: medicationId est null pour le médicament: {}", itemDTO.getMedicationName());
                    throw new RuntimeException("medicationId ne peut pas être null pour le médicament: " + itemDTO.getMedicationName());
                }
                
                Medication medication;
                try {
                    // Essayer de trouver par ID d'abord
                    medication = medicationRepository.findById(itemDTO.getMedicationId())
                        .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé avec ID: " + itemDTO.getMedicationId()));
                } catch (ResourceNotFoundException e) {
                    // Si l'ID n'est pas trouvé, essayer par code du médicament (plus fiable que le nom)
                    log.info("🔄 ID non trouvé, tentative de recherche par code: {}", itemDTO.getMedicationCode());
                    try {
                        medication = medicationRepository.findByMedicationCode(itemDTO.getMedicationCode())
                            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé avec ID: " + itemDTO.getMedicationId() + " ni avec code: " + itemDTO.getMedicationCode()));
                        log.info("✅ Médicament trouvé par code: {} (ID: {})", medication.getMedicationCode(), medication.getId());
                    } catch (Exception codeException) {
                        // En dernier recours, essayer par nom mais gérer les doublons
                        log.info("🔄 Code non trouvé, tentative de recherche par nom exact: {}", itemDTO.getMedicationName());
                        try {
                            List<Medication> medications = medicationRepository.findByNameContaining(itemDTO.getMedicationName());
                            if (medications.isEmpty()) {
                                throw new ResourceNotFoundException("Médicament non trouvé avec ID: " + itemDTO.getMedicationId() + ", code: " + itemDTO.getMedicationCode() + " ni avec nom: " + itemDTO.getMedicationName());
                            } else if (medications.size() == 1) {
                                medication = medications.get(0);
                                log.info("✅ Médicament trouvé par nom: {} (ID: {})", medication.getName(), medication.getId());
                            } else {
                                // Plusieurs médicaments trouvés - essayer de trouver une correspondance exacte
                                Medication exactMatch = medications.stream()
                                    .filter(m -> m.getName().equalsIgnoreCase(itemDTO.getMedicationName()))
                                    .findFirst()
                                    .orElse(medications.get(0)); // Fallback au premier si aucune correspondance exacte
                                
                                medication = exactMatch;
                                log.warn("⚠️ Plusieurs médicaments trouvés avec le nom '{}'. Utilisation de: ID {}, Code {}", 
                                    itemDTO.getMedicationName(), medication.getId(), medication.getMedicationCode());
                            }
                        } catch (Exception nameException) {
                            throw new ResourceNotFoundException("Médicament non trouvé avec ID: " + itemDTO.getMedicationId() + ", code: " + itemDTO.getMedicationCode() + " ni avec nom: " + itemDTO.getMedicationName());
                        }
                    }
                }
                
                // Extract numeric value from duration string (e.g., "7 jours" -> 7)
                Integer durationValue = null;
                if (itemDTO.getDuration() != null && !itemDTO.getDuration().trim().isEmpty()) {
                    try {
                        durationValue = Integer.parseInt(itemDTO.getDuration().replaceAll("[^0-9]", ""));
                    } catch (NumberFormatException e) {
                        // Log error but continue with null duration
                        System.err.println("Invalid duration format: " + itemDTO.getDuration());
                    }
                }

                PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .medication(medication)
                    .dosage(itemDTO.getDosage())
                    .frequency(itemDTO.getFrequency())
                    .duration(durationValue)
                    .quantity(itemDTO.getQuantity())
                    .quantityPerDose(itemDTO.getQuantityPerDose())
                    .build();
                
                prescriptionItemRepository.save(item);
            }
        }
        
        PrescriptionDTO result = mapToDTO(prescription);
        
        // ✅ AUTO-CRÉATION DE LA FACTURE pour la caisse pharmacie
        try {
            log.info("🧾 [AUTO-INVOICE] Création automatique de la facture pour prescription ID: {}", prescription.getId());
            System.out.println("🧾 [AUTO-INVOICE] Création automatique de la facture pour prescription ID=" + prescription.getId());
            System.out.flush();
            invoiceService.createPrescriptionInvoice(prescription.getId(), doctor);
            log.info("✅ [AUTO-INVOICE] Facture créée avec succès pour prescription ID: {}", prescription.getId());
            System.out.println("✅ [AUTO-INVOICE] Facture créée avec succès pour prescription ID=" + prescription.getId());
            System.out.flush();
        } catch (Exception e) {
            log.error("❌ [AUTO-INVOICE] Erreur lors de la création de la facture: {}", e.getMessage());
            log.error("❌ [AUTO-INVOICE] Stack trace:", e);
            System.out.println("❌ [AUTO-INVOICE] Erreur: " + e.getMessage());
            e.printStackTrace(System.out);
            System.out.flush();
            // Ne pas bloquer la création de la prescription si la facture échoue
        }
        
        return result;
    }
    
    private PrescriptionDTO mapToDTO(Prescription prescription) {
        List<PrescriptionDTO.PrescriptionItemDTO> items = prescriptionItemRepository.findByPrescriptionId(prescription.getId())
            .stream()
            .map(this::mapItemToDTO)
            .collect(Collectors.toList());
        
        return PrescriptionDTO.builder()
            .id(prescription.getId())
            .prescriptionCode(prescription.getPrescriptionCode())
            .patientId(prescription.getPatient().getId())
            .patientName(prescription.getPatient().getFirstName() + " " + prescription.getPatient().getLastName())
            .doctorId(prescription.getDoctor().getId())
            .doctorName(prescription.getDoctor().getFirstName() + " " + prescription.getDoctor().getLastName())
            .consultationId(prescription.getConsultation() != null ? prescription.getConsultation().getId() : null)
            .createdAt(prescription.getCreatedAt())
            .status(prescription.getStatus())
            .notes(prescription.getNotes())
            .totalAmount(prescription.getTotalAmount())
            .amountPaid(prescription.getAmountPaid())
            .items(items)
            .build();
    }
    
    private PrescriptionDTO.PrescriptionItemDTO mapItemToDTO(PrescriptionItem item) {
        // Convert Integer duration back to String for DTO
        String durationStr = item.getDuration() != null ? item.getDuration().toString() : null;
        
        // Get stock information from medication
        Integer stockQuantity = item.getMedication().getStockQuantity();
        BigDecimal unitPrice = item.getMedication().getUnitPrice();
        
        // Calculate total price safely
        BigDecimal totalPrice = BigDecimal.ZERO;
        if (unitPrice != null && item.getQuantity() != null) {
            totalPrice = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
        }
        
        return PrescriptionDTO.PrescriptionItemDTO.builder()
            .id(item.getId())
            .medicationId(item.getMedication().getId())
            .medicationName(item.getMedication().getName())
            .dosage(item.getDosage())
            .frequency(item.getFrequency())
            .duration(durationStr)
            .quantity(item.getQuantity() != null ? item.getQuantity() : 0)
            .quantityPerDose(item.getQuantityPerDose())
            .unitPrice(unitPrice != null ? unitPrice : BigDecimal.ZERO)
            .totalPrice(totalPrice)
            .stockQuantity(stockQuantity != null ? stockQuantity : 0)
            .build();
    }
    
    // Implémentations des autres méthodes (à compléter selon les besoins)
    @Override
    public PrescriptionDTO update(Long id, PrescriptionDTO dto) {
        // TODO: Implémenter
        return null;
    }
    
    @Override
    @Transactional(readOnly = true)
    public PrescriptionDTO getById(Long id) {
        log.info("Récupération de la prescription ID: {}", id);
        Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Prescription non trouvée avec ID: " + id));
        return mapToDTO(prescription);
    }
    
    @Override
    public PrescriptionDTO getByCode(String code) {
        // TODO: Implémenter
        return null;
    }
    
    @Override
    public PageResponse<PrescriptionDTO> getAll(Pageable pageable) {
        // TODO: Implémenter
        return null;
    }
    
    @Override
    public PageResponse<PrescriptionDTO> getByPatient(Long patientId, Pageable pageable) {
        // TODO: Implémenter
        return null;
    }
    
    @Override
    public PageResponse<PrescriptionDTO> getByDoctor(Long doctorId, Pageable pageable) {
        // TODO: Implémenter
        return null;
    }
    
    @Override
    public PageResponse<PrescriptionDTO> getByStatus(PrescriptionStatus status, Pageable pageable) {
        // TODO: Implémenter
        return null;
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionDTO> getPendingPrescriptions() {
        log.info("Récupération des prescriptions en attente");
        
        List<Prescription> pendingPrescriptions = prescriptionRepository.findPendingPrescriptions();
        
        return pendingPrescriptions.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Override
    public PrescriptionDTO dispense(Long id, Long pharmacistId) {
        // TODO: Implémenter
        return null;
    }
    
    @Override
    @Transactional
    public PrescriptionDTO updateStatus(Long id, PrescriptionStatus status) {
        log.info("Mise à jour du statut de la prescription {} vers {}", id, status);
        
        Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Prescription non trouvée"));
        
        prescription.setStatus(status);
        prescription = prescriptionRepository.save(prescription);
        
        return mapToDTO(prescription);
    }
    
    @Override
    public void delete(Long id) {
        // TODO: Implémenter
    }

    @Override
    @Transactional
    public void updateItems(Long prescriptionId, List<Map<String, Object>> items) {
        log.info("🔍 [DEBUG] Mise à jour de {} items pour la prescription {}", items.size(), prescriptionId);
        
        for (Map<String, Object> itemData : items) {
            Long itemId = ((Number) itemData.get("id")).longValue();
            Integer quantity = itemData.get("quantity") != null ? ((Number) itemData.get("quantity")).intValue() : null;
            
            PrescriptionItem item = prescriptionItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item non trouvé: " + itemId));
            
            // Vérifier que l'item appartient bien à la bonne prescription
            if (!item.getPrescription().getId().equals(prescriptionId)) {
                log.error("❌ [DEBUG] L'item {} n'appartient pas à la prescription {}", itemId, prescriptionId);
                throw new RuntimeException("L'item n'appartient pas à cette prescription");
            }
            
            if (quantity != null && quantity > 0) {
                log.info("🔍 [DEBUG] Mise à jour item {}: quantity {} -> {}", itemId, item.getQuantity(), quantity);
                item.setQuantity(quantity);
                prescriptionItemRepository.save(item);
            }
        }
    }
}