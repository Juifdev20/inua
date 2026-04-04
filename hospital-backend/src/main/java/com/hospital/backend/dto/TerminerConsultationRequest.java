package com.hospital.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerminerConsultationRequest {
    
    private String diagnostic;
    
    // Accepter les IDs comme Integer (format frontend)
    private List<Integer> examenIds;
    
    // Méthode utilitaire pour convertir en Long
    public List<Long> getExamensIdsAsLong() {
        if (examenIds == null) {
            return List.of();
        }
        return examenIds.stream()
                .map(Integer::longValue)
                .collect(java.util.stream.Collectors.toList());
    }
}
