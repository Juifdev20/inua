package com.hospital.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class TerminationDTO {
    private String diagnostic;
    private String traitement;
    private String notesMedicales;
    private List<ExamDTO> exams;
    
    @Data
    public static class ExamDTO {
        private Long serviceId;
        private String note;
    }
}
