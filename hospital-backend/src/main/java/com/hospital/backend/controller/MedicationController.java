package com.hospital.backend.controller;

import com.hospital.backend.dto.MedicationDTO;
import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.service.MedicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/medications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Medications", description = "Gestion des médicaments et inventaire pharmacie")
@CrossOrigin(origins = "http://localhost:5173")
public class MedicationController {

    private final MedicationService medicationService;

    @PostMapping("/inventory/add")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Ajouter un médicament en stock", description = "Ajoute un nouveau médicament à l'inventaire de la pharmacie")
    public ResponseEntity<ApiResponse<MedicationDTO>> addMedicationToInventory(@Valid @RequestBody MedicationDTO medicationDTO) {
        try {
            log.info("Ajout d'un médicament à l'inventaire: {}", medicationDTO.getName());
            
            MedicationDTO savedMedication = medicationService.saveMedication(medicationDTO);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Médicament ajouté à l'inventaire avec succès", savedMedication));
                    
        } catch (Exception e) {
            log.error("Erreur lors de l'ajout du médicament à l'inventaire: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de l'ajout du médicament: " + e.getMessage()));
        }
    }

    @GetMapping("/inventory")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN', 'ROLE_DOCTEUR')")
    @Operation(summary = "Liste des médicaments en stock", description = "Récupère tous les médicaments en stock")
    public ResponseEntity<ApiResponse<java.util.List<MedicationDTO>>> getInventory() {
        try {
            java.util.List<MedicationDTO> medications = medicationService.getAllMedications();
            
            // 🔍 DEBUG LOG - Vérification des prix
            log.info("📊 DEBUG: Nombre de médicaments récupérés: {}", medications.size());
            for (int i = 0; i < medications.size(); i++) {
                MedicationDTO med = medications.get(i);
                log.info("📊 DEBUG [{}]: {} | price: {} (type: {}) | unitPrice: {} (type: {}) | stock: {}", 
                    i, 
                    med.getName(), 
                    med.getPrice(), 
                    med.getPrice() != null ? med.getPrice().getClass().getSimpleName() : "null",
                    med.getUnitPrice(), 
                    med.getUnitPrice() != null ? med.getUnitPrice().getClass().getSimpleName() : "null",
                    med.getStockQuantity()
                );
            }
            
            return ResponseEntity.ok(ApiResponse.success("Inventaire récupéré avec succès", medications));
        } catch (Exception e) {
            log.error("Erreur lors de la récupération de l'inventaire: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la récupération de l'inventaire: " + e.getMessage()));
        }
    }

    @PutMapping("/inventory/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Mettre à jour un médicament", description = "Met à jour les informations d'un médicament en stock")
    public ResponseEntity<ApiResponse<MedicationDTO>> updateMedication(
            @PathVariable Long id, 
            @Valid @RequestBody MedicationDTO medicationDTO) {
        try {
            log.info("Mise à jour du médicament ID: {}", id);
            
            MedicationDTO updatedMedication = medicationService.updateMedication(id, medicationDTO);
            
            return ResponseEntity.ok(ApiResponse.success("Médicament mis à jour avec succès", updatedMedication));
                    
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour du médicament: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la mise à jour du médicament: " + e.getMessage()));
        }
    }

    @DeleteMapping("/inventory/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Supprimer un médicament", description = "Supprime un médicament de l'inventaire")
    public ResponseEntity<ApiResponse<Void>> deleteMedication(@PathVariable Long id) {
        try {
            log.info("Suppression du médicament ID: {}", id);
            
            medicationService.deleteMedication(id);
            
            return ResponseEntity.ok(ApiResponse.success("Médicament supprimé avec succès", null));
                    
        } catch (Exception e) {
            log.error("Erreur lors de la suppression du médicament: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la suppression du médicament: " + e.getMessage()));
        }
    }
}
