package com.hospital.backend.service;

import com.hospital.backend.dto.MedicalRecordDTO;
import com.hospital.backend.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface MedicalRecordService {
    MedicalRecordDTO create(MedicalRecordDTO recordDTO);
    MedicalRecordDTO update(Long id, MedicalRecordDTO recordDTO);
    MedicalRecordDTO getById(Long id);
    MedicalRecordDTO getByCode(String code);
    PageResponse<MedicalRecordDTO> getAll(Pageable pageable);
    PageResponse<MedicalRecordDTO> getByPatient(Long patientId, Pageable pageable);
    List<MedicalRecordDTO> getPatientHistory(Long patientId);
    void delete(Long id);
}
