package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour la création d'un avoir (contre-passation)
 * Utilisé en cas d'erreur sur une transaction déjà validée
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorrectionTransactionDTO {

    private Long transactionOriginaleId;
    private String motifCorrection;
}
