package com.hospital.backend.service;

import com.hospital.backend.dto.AdmissionDTO;
import java.util.List;

public interface AdmissionService {
    
    AdmissionDTO getById(Long id);
    
    List<AdmissionDTO> getAll();
    
    List<AdmissionDTO> getByPatientId(Long patientId);
    
    AdmissionDTO create(AdmissionDTO admissionDTO);
    
    AdmissionDTO update(Long id, AdmissionDTO admissionDTO);
    
    void delete(Long id);
}
