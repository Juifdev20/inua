package com.hospital.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyEmployeeResponse {

    private Long id;
    private Long companyId;
    private String companyName;

    private Long patientId;
    private String patientCode;
    private String patientFirstName;
    private String patientLastName;
    private String patientFullName;
    private String patientPhone;

    private String matricule;

    private Long dependantOfId;
    private String dependantOfName;

    private Boolean isActive;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
