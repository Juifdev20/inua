package com.hospital.backend.dto;

import com.hospital.backend.entity.SubscriptionStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyRequest {

    @NotBlank(message = "Le nom de l'entreprise est obligatoire")
    @Size(max = 200)
    private String name;

    @Size(max = 500)
    private String address;

    @Size(max = 50)
    private String phone;

    @Size(max = 150)
    private String email;

    @Size(max = 150)
    private String contactPerson;

    @Size(max = 100)
    private String contractNumber;

    private SubscriptionStatus subscriptionStatus;

    @DecimalMin(value = "0.0", message = "Le taux de couverture doit être >= 0")
    @DecimalMax(value = "100.0", message = "Le taux de couverture doit être <= 100")
    private BigDecimal coverageRate;

    @DecimalMin(value = "0.0", message = "Le surplus doit être >= 0")
    @DecimalMax(value = "100.0", message = "Le surplus doit être <= 100")
    private BigDecimal surplusRate;
}
