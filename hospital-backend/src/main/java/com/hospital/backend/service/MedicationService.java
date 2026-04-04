package com.hospital.backend.service;

import com.hospital.backend.dto.MedicationDTO;
import com.hospital.backend.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface MedicationService {
    MedicationDTO create(MedicationDTO medicationDTO);
    MedicationDTO update(Long id, MedicationDTO medicationDTO);
    MedicationDTO getById(Long id);
    MedicationDTO getByCode(String code);
    PageResponse<MedicationDTO> getAll(Pageable pageable);
    PageResponse<MedicationDTO> search(String query, Pageable pageable);
    List<MedicationDTO> getLowStockMedications();
    List<MedicationDTO> getExpiredMedications();
    MedicationDTO updateStock(Long id, Integer quantity);
    void delete(Long id);
    void deactivate(Long id);
    
    // Nouvelles méthodes pour l'inventaire pharmacie
    MedicationDTO saveMedication(MedicationDTO medicationDTO);
    MedicationDTO updateMedication(Long id, MedicationDTO medicationDTO);
    void deleteMedication(Long id);
    List<MedicationDTO> getAllMedications();
    MedicationDTO getMedicationById(Long id);
    MedicationDTO findByName(String name);
}
