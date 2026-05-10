package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.Signalement;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.SignalementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.hospital.backend.dto.SignalementRequest;

import java.security.Principal;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor

public class SupportController {
    private final SignalementRepository signalementRepository;
    private final PatientRepository patientRepository;

    @PostMapping("/report")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> creerSignalement(@RequestBody SignalementRequest request, Principal principal) {
        // 1. Trouver le patient via son email (Token)
        Patient patient = patientRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé"));

        // 2. Créer le signalement
        Signalement s = new Signalement();
        s.setPatient(patient);
        s.setType(request.getType());
        s.setDescription(request.getDescription());
        // s.setDoctor(... trouver le docteur par son ID fourni ...)

        signalementRepository.save(s);
        return ResponseEntity.ok(ApiResponse.success("Signalement envoyé à l'administration"));
    }
}
