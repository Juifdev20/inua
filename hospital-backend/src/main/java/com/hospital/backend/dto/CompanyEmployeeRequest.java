package com.hospital.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyEmployeeRequest {

    @NotNull(message = "patientId est obligatoire")
    private Long patientId;

    @Size(max = 80)
    private String matricule;

    /** ID d'un autre CompanyEmployee si cet agent est un dépendant. */
    private Long dependantOfId;

    private Boolean isActive;
}
