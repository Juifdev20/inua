package com.hospital.backend.controller;

import com.hospital.backend.dto.AdmissionDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.service.AdmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admissions")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTEUR')")
public class AdmissionController {

    private final AdmissionService admissionService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTEUR')")
    public ResponseEntity<AdmissionDTO> getAdmissionById(@PathVariable Long id) {
        log.info("Récupération de l'admission ID: {}", id);
        AdmissionDTO admission = admissionService.getById(id);
        return ResponseEntity.ok(admission);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTEUR')")
    public ResponseEntity<List<AdmissionDTO>> getAllAdmissions() {
        log.info("Récupération de toutes les admissions");
        List<AdmissionDTO> admissions = admissionService.getAll();
        return ResponseEntity.ok(admissions);
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTEUR')")
    public ResponseEntity<List<AdmissionDTO>> getAdmissionsByPatient(@PathVariable Long patientId) {
        log.info("Récupération des admissions pour le patient ID: {}", patientId);
        List<AdmissionDTO> admissions = admissionService.getByPatientId(patientId);
        return ResponseEntity.ok(admissions);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    public ResponseEntity<AdmissionDTO> createAdmission(@RequestBody AdmissionDTO admissionDTO) {
        log.info("Création d'une nouvelle admission");
        AdmissionDTO created = admissionService.create(admissionDTO);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTEUR')")
    public ResponseEntity<AdmissionDTO> updateAdmission(
            @PathVariable Long id,
            @RequestBody AdmissionDTO admissionDTO) {
        log.info("Mise à jour de l'admission ID: {}", id);
        AdmissionDTO updated = admissionService.update(id, admissionDTO);
        return ResponseEntity.ok(updated);
    }
}
