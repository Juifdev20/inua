package com.hospital.backend.service;

import com.hospital.backend.dto.PrescriptionDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.PrescriptionStatus;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface PrescriptionService {
    PrescriptionDTO create(PrescriptionDTO prescriptionDTO);
    PrescriptionDTO update(Long id, PrescriptionDTO prescriptionDTO);
    PrescriptionDTO getById(Long id);
    PrescriptionDTO getByCode(String code);
    PageResponse<PrescriptionDTO> getAll(Pageable pageable);
    PageResponse<PrescriptionDTO> getByPatient(Long patientId, Pageable pageable);
    PageResponse<PrescriptionDTO> getByDoctor(Long doctorId, Pageable pageable);
    PageResponse<PrescriptionDTO> getByStatus(PrescriptionStatus status, Pageable pageable);
    List<PrescriptionDTO> getPendingPrescriptions();
    PrescriptionDTO dispense(Long id, Long pharmacistId);
    PrescriptionDTO updateStatus(Long id, PrescriptionStatus status);
    void delete(Long id);
}
