package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.ConsultationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/doctors")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DoctorDashboardController {

    private final ConsultationService consultationService;
    private final UserRepository userRepository;

    /**
     * Dashboard endpoint pour récupérer les données du médecin via l'endpoint de DoctorController
     * Ce contrôleur fournit des méthodes supplémentaires spécifiques au dashboard
     */
    
    /**
     * Dashboard docteur avec consultations EN_ATTENTE incluant vitaux et motif
     */
    @GetMapping("/{doctorId}/dashboard")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDoctorDashboard(@PathVariable Long doctorId) {
        log.info("Dashboard docteur : consultations EN_ATTENTE pour le docteur {}", doctorId);
        
        // Récupérer toutes les consultations EN_ATTENTE pour ce docteur
        PageResponse<ConsultationDTO> enAttentePage = consultationService.getByStatus(ConsultationStatus.EN_ATTENTE, Pageable.unpaged());
        List<ConsultationDTO> rdvsEnAttente = enAttentePage.getContent()
            .stream()
            .filter(c -> c.getDoctorId() != null && c.getDoctorId().equals(doctorId))
            .collect(Collectors.toList());
        
        // Mapper pour inclure les informations complètes demandées par le frontend
        List<Map<String, Object>> rdvsToday = rdvsEnAttente.stream()
            .map(this::mapToDashboardItem)
            .collect(Collectors.toList());
        
        Map<String, Object> response = Map.of(
            "rdvs_today", rdvsToday,
            "stats", Map.of(
                "consultations_pending", rdvsEnAttente.size(),
                "rdvs_today_count", rdvsEnAttente.size()
            )
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * Convertit une ConsultationDTO en objet dashboard avec vitaux et motif
     */
    private Map<String, Object> mapToDashboardItem(ConsultationDTO dto) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", dto.getId());
        map.put("consultationDate", dto.getConsultationDate());
        map.put("status", dto.getStatus().toString());
        map.put("patientId", dto.getPatientId());
        map.put("patientName", dto.getPatientName());
        map.put("phoneNumber", dto.getPhoneNumber());
        map.put("reasonForVisit", dto.getReasonForVisit() != null ? dto.getReasonForVisit() : "Consultation");
        map.put("motif", dto.getReasonForVisit());
        // Signes vitaux (disponibles pour les consultations EN_ATTENTE)
        map.put("poids", dto.getPoids());
        map.put("temperature", dto.getTemperature());
        map.put("taille", dto.getTaille());
        map.put("tensionArterielle", dto.getTensionArterielle());
        map.put("doctorId", dto.getDoctorId());
        map.put("doctorName", dto.getDoctorName());
        return map;
    }
}
