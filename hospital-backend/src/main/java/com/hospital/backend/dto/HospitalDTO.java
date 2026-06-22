package com.hospital.backend.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HospitalDTO {

    private Long id;
    private String nom;
    private String code;
    private String address;
    private String city;
    private String country;
    private String phone;
    private String email;
    private String logoUrl;
    private Boolean isActive;
    private String subscriptionPlan;
    private Integer maxUsers;
    private String adminEmail;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private long totalUsers;
    private long totalPatients;
}
