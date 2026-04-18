package com.hospital.backend.dto;

import com.hospital.backend.entity.PaiementMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO pour la validation d'une dépense par le caissier
 * Le scan de facture est obligatoire
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationDepenseDTO {

    private Long transactionId;
    private PaiementMode modePaiement;
    private Long caisseId;  // Requis si modePaiement = IMMEDIAT
    private LocalDate dateEcheancePaiement;  // Requis si modePaiement = CREDIT
    private String notesValidation;
}
