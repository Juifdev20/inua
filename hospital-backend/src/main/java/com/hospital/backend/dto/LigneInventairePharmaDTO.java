package com.hospital.backend.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LigneInventairePharmaDTO {

    private Long id;
    private Long inventaireId;
    private Long medicamentId;
    private String medicamentNom;
    private String codeDci;
    private String forme;
    private String dosage;
    private String unite;
    private BigDecimal stockTheorique;
    private BigDecimal stockPhysique;
    private BigDecimal ecart;
    private BigDecimal valeurEcart;
    private BigDecimal prixAchat;
    private String observation;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MajLigneRequest {
        private Long ligneId;
        private BigDecimal stockPhysique;
        private String observation;
    }
}
