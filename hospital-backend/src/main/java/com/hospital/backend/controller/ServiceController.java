package com.hospital.backend.controller;

import com.hospital.backend.dto.ServiceDTO;
import com.hospital.backend.entity.MedicalService;
import com.hospital.backend.repository.MedicalServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class ServiceController {

    private final MedicalServiceRepository serviceRepository;

    @GetMapping
    public ResponseEntity<List<ServiceDTO>> getAvailableServices() {
        log.info("Récupération de la liste des services disponibles");
        List<MedicalService> services = serviceRepository.findByIsActiveTrue();
        List<ServiceDTO> dtos = services.stream()
                .map(s -> ServiceDTO.builder()
                        .id(s.getId())
                        .name(s.getNom())
                        .price(s.getPrix())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
}
