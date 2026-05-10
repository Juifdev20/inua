package com.hospital.backend.service;

import com.hospital.backend.dto.LabTestDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.LabTestStatus;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface LabTestService {
    LabTestDTO create(LabTestDTO labTestDTO);
    LabTestDTO update(Long id, LabTestDTO labTestDTO);
    LabTestDTO getById(Long id);
    LabTestDTO getByCode(String code);
    PageResponse<LabTestDTO> getAll(Pageable pageable);
    PageResponse<LabTestDTO> getByPatient(Long patientId, Pageable pageable);
    PageResponse<LabTestDTO> getByConsultation(Long consultationId, Pageable pageable);
    PageResponse<LabTestDTO> getByStatus(LabTestStatus status, Pageable pageable);
    List<LabTestDTO> getPendingTests();
    LabTestDTO addResults(Long id, String results, String interpretation);
    LabTestDTO updateStatus(Long id, LabTestStatus status);
    void delete(Long id);
}
