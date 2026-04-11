package com.hospital.backend.controller;

import com.hospital.backend.dto.PrescriptionDTO;
import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.service.PrescriptionService;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.entity.User;
import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Prescriptions", description = "Gestion des prescriptions médicales")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final UserRepository userRepository;

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('DOCTEUR', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Créer une prescription", description = "Crée une nouvelle prescription à partir des résultats de laboratoire")
    public ResponseEntity<ApiResponse<PrescriptionDTO>> createPrescription(
            @Valid @RequestBody PrescriptionDTO prescriptionDTO, 
            Authentication authentication) {
        log.info("🔥🔥🔥 [PRESCRIPTION CONTROLLER] /api/prescriptions/create APPELÉ! 🔥🔥🔥");
        try {
            // Récupérer le docteur connecté depuis le JWT token
            String username = authentication.getName();
            User doctor = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Docteur non trouvé: " + username));
            
            // Injecter automatiquement le doctorId dans le DTO
            prescriptionDTO.setDoctorId(doctor.getId());
            
            log.info("Création d'une prescription pour le patient ID: {} par le docteur: {} (ID: {})", 
                    prescriptionDTO.getPatientId(), doctor.getUsername(), doctor.getId());
            
            PrescriptionDTO createdPrescription = prescriptionService.createPrescription(prescriptionDTO);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Prescription créée avec succès", createdPrescription));
                    
        } catch (Exception e) {
            log.error("Erreur lors de la création de la prescription: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la création de la prescription: " + e.getMessage()));
        }
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Liste des prescriptions en attente", description = "Récupère toutes les prescriptions en attente de validation par la pharmacie")
    public ResponseEntity<ApiResponse<List<PrescriptionDTO>>> getPendingPrescriptions() {
        try {
            log.info("Récupération des prescriptions en attente pour la pharmacie");
            
            List<PrescriptionDTO> pendingPrescriptions = prescriptionService.getPendingPrescriptions();
            
            return ResponseEntity.ok(ApiResponse.success("Prescriptions en attente récupérées avec succès", pendingPrescriptions));
                    
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des prescriptions en attente: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la récupération des prescriptions: " + e.getMessage()));
        }
    }
}
