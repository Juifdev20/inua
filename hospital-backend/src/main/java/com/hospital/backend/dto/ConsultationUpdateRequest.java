package com.hospital.backend.dto;

import com.hospital.backend.entity.ExamItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultationUpdateRequest {
    
    private String diagnostic;
    private String traitement;
    private String notesMedicales;
    private List<ExamItem> exams;
    private String statut;
}
