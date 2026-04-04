package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reception")
@PreAuthorize("hasAnyRole('RECEPTION','ADMIN')")
@Tag(name = "Réception")

public class ReceptionController {

        @GetMapping("/dashboard")
        public ApiResponse<String> dashboard() {
            return ApiResponse.success("Dashboard Réception");
        }
    }
