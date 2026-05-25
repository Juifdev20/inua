package com.hospital.backend.dto;

import com.hospital.backend.entity.InventaireStatut;
import com.hospital.backend.entity.TypeInventaire;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventairePharmaDTO {

    private Long id;
    private LocalDate date;
    private TypeInventaire type;
    private InventaireStatut statut;

    private Long agentId;
    private String agentNom;
    private String agentPrenom;

    private Long pharmacienChefId;
    private String pharmacienChefNom;
    private String pharmacienChefPrenom;

    private String observations;
    private LocalDateTime dateApprobation;
    private int nbLignes;

    private List<LigneInventairePharmaDTO> lignes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreerRequest {
        private TypeInventaire type;
        private String observations;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MajLignesRequest {
        private List<LigneInventairePharmaDTO.MajLigneRequest> lignes;
    }
}
