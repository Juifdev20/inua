package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rh")
@PreAuthorize("hasAnyRole('RH','ADMIN')")
@Tag(name = "Ressources Humaines")

public class RhController {


        @GetMapping("/employees")
        public ApiResponse<String> getEmployees() {
            return ApiResponse.success("Liste des employés");
        }
    }


