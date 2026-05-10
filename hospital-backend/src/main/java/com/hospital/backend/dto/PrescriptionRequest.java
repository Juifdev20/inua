package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionRequest {
    
    private Long consultationId;
    private List<Long> serviceIds; // Liste des IDs de services à prescrire
    private List<String> doctorNotes; // Notes optionnelles pour chaque service
    
    public static class PrescriptionItem {
        private Long serviceId;
        private String doctorNote;
        
        public PrescriptionItem(Long serviceId, String doctorNote) {
            this.serviceId = serviceId;
            this.doctorNote = doctorNote;
        }
        
        public Long getServiceId() { return serviceId; }
        public String getDoctorNote() { return doctorNote; }
    }
}
