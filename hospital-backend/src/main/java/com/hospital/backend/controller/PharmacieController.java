package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/pharmacie")
@PreAuthorize("hasAnyRole('PHARMACIE','ADMIN')")
@Tag(name = "Pharmacie")

public class PharmacieController {


        @GetMapping("/medications")
        public ApiResponse<String> getMedications() {
            return ApiResponse.success("Gestion des médicaments");
        }
    }

