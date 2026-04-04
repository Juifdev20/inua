package com.hospital.backend.service.impl;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
        
        // Ajouter les items
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            List<PrescriptionItem> items = new ArrayList<>();
            for (PrescriptionItemDTO itemDTO : dto.getItems()) {
                Medication medication = medicationRepository.findById(itemDTO.getMedicationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
                
                PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .medication(medication)
                    .quantity(itemDTO.getQuantity())
                    .dosage(itemDTO.getDosage())
                    .frequency(itemDTO.getFrequency())
                    .duration(itemDTO.getDuration())
                    .durationUnit(itemDTO.getDurationUnit())
                    .instructions(itemDTO.getInstructions())
                    .isDispensed(false)
                    .build();
                items.add(item);
            }
            prescriptionItemRepository.saveAll(items);
            prescription.setItems(items);
        }
        
        log.info("Ordonnance créée avec le code: {}", prescription.getPrescriptionCode());
        return mapToDTO(prescription);
    }
    
    @Override
    @Transactional
    public PrescriptionDTO update(Long id, PrescriptionDTO dto) {
        log.info("Mise à jour de l'ordonnance ID: {}", id);
        
        Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ordonnance non trouvée"));
        
        if (dto.getNotes() != null) prescription.setNotes(dto.getNotes());
        
        prescription = prescriptionRepository.save(prescription);
        return mapToDTO(prescription);
    }
    
    @Override
    public PrescriptionDTO getById(Long id) {
        Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ordonnance non trouvée"));
        return mapToDTO(prescription);
    }
    
    @Override
    public PrescriptionDTO getByCode(String code) {
        Prescription prescription = prescriptionRepository.findByPrescriptionCode(code)
            .orElseThrow(() -> new ResourceNotFoundException("Ordonnance non trouvée"));
        return mapToDTO(prescription);
    }
    
    @Override
    public PageResponse<PrescriptionDTO> getAll(Pageable pageable) {
        Page<Prescription> page = prescriptionRepository.findAll(pageable);
        return toPageResponse(page);
    }
    
    @Override
    public PageResponse<PrescriptionDTO> getByPatient(Long patientId, Pageable pageable) {
        Page<Prescription> page = prescriptionRepository.findByPatientId(patientId, pageable);
        return toPageResponse(page);
    }
    
    @Override
    public PageResponse<PrescriptionDTO> getByDoctor(Long doctorId, Pageable pageable) {
        Page<Prescription> page = prescriptionRepository.findByDoctorId(doctorId, pageable);
        return toPageResponse(page);
    }
    
    @Override
    public PageResponse<PrescriptionDTO> getByStatus(PrescriptionStatus status, Pageable pageable) {
        Page<Prescription> page = prescriptionRepository.findByStatus(status, pageable);
        return toPageResponse(page);
    }
    
    @Override
    public List<PrescriptionDTO> getPendingPrescriptions() {
        return prescriptionRepository.findPendingPrescriptions().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Override
    @Transactional
    public PrescriptionDTO dispense(Long id, Long pharmacistId) {
        log.info("Délivrance de l'ordonnance ID: {} par le pharmacien ID: {}", id, pharmacistId);
        
        Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ordonnance non trouvée"));
        
        User pharmacist = userRepository.findById(pharmacistId)
            .orElseThrow(() -> new ResourceNotFoundException("Pharmacien non trouvé"));
        
        // Marquer tous les items comme délivrés
        List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionId(id);
        for (PrescriptionItem item : items) {
            item.setIsDispensed(true);
            item.setDispensedQuantity(item.getQuantity());
            
            // Mettre à jour le stock
            Medication medication = item.getMedication();
            int newStock = medication.getStockQuantity() - item.getQuantity();
            medication.setStockQuantity(Math.max(0, newStock));
            medicationRepository.save(medication);
        }
        prescriptionItemRepository.saveAll(items);
        
        prescription.setDispensedBy(pharmacist);
        prescription.setDispensedAt(LocalDateTime.now());
        prescription.setStatus(PrescriptionStatus.DELIVREE);
        
        prescription = prescriptionRepository.save(prescription);
        return mapToDTO(prescription);
    }
    
    @Override
    @Transactional
    public PrescriptionDTO updateStatus(Long id, PrescriptionStatus status) {
        log.info("Mise à jour du statut de l'ordonnance ID: {} vers {}", id, status);
        
        Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ordonnance non trouvée"));
        
        prescription.setStatus(status);
        prescription = prescriptionRepository.save(prescription);
        
        return mapToDTO(prescription);
    }
    
    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Suppression de l'ordonnance ID: {}", id);
        Prescription prescription = prescriptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ordonnance non trouvée"));
        prescriptionRepository.delete(prescription);
    }
    
    private PrescriptionDTO mapToDTO(Prescription p) {
        List<PrescriptionItemDTO> itemDTOs = null;
        if (p.getItems() != null) {
            itemDTOs = p.getItems().stream()
                .map(this::mapItemToDTO)
                .collect(Collectors.toList());
        }
        
        PrescriptionDTO.PrescriptionDTOBuilder builder = PrescriptionDTO.builder()
            .id(p.getId())
            .prescriptionCode(p.getPrescriptionCode())
            .consultationId(p.getConsultation().getId())
            .patientId(p.getPatient().getId())
            .patientName(p.getPatient().getFirstName() + " " + p.getPatient().getLastName())
            .doctorId(p.getDoctor().getId())
            .doctorName(p.getDoctor().getFirstName() + " " + p.getDoctor().getLastName())
            .items(itemDTOs)
            .notes(p.getNotes())
            .status(p.getStatus())
            .dispensedAt(p.getDispensedAt())
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt());
        
        if (p.getDispensedBy() != null) {
            builder.dispensedById(p.getDispensedBy().getId())
                .dispensedByName(p.getDispensedBy().getFirstName() + " " + p.getDispensedBy().getLastName());
        }
        
        return builder.build();
    }
    
    private PrescriptionItemDTO mapItemToDTO(PrescriptionItem item) {
        return PrescriptionItemDTO.builder()
            .id(item.getId())
            .medicationId(item.getMedication().getId())
            .medicationName(item.getMedication().getName())
            .quantity(item.getQuantity())
            .dosage(item.getDosage())
            .frequency(item.getFrequency())
            .duration(item.getDuration())
            .durationUnit(item.getDurationUnit())
            .instructions(item.getInstructions())
            .isDispensed(item.getIsDispensed())
            .dispensedQuantity(item.getDispensedQuantity())
            .build();
    }
    
    private PageResponse<PrescriptionDTO> toPageResponse(Page<Prescription> page) {
        return PageResponse.<PrescriptionDTO>builder()
            .content(page.getContent().stream().map(this::mapToDTO).toList())
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .first(page.isFirst())
            .last(page.isLast())
            .build();
    }
}
