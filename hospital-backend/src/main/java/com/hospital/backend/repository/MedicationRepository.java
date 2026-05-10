package com.hospital.backend.repository;

import com.hospital.backend.entity.Medication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, Long> {
    
    Optional<Medication> findByMedicationCode(String medicationCode);
    
    Optional<Medication> findByName(String name);
    
    List<Medication> findByNameContaining(String name);
    
    List<Medication> findByCategory(String category);
    
    Page<Medication> findByIsActiveTrue(Pageable pageable);
    
    List<Medication> findByIsActiveTrue();
    
    @Query("SELECT m FROM Medication m WHERE " +
           "LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.genericName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.medicationCode) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Medication> searchMedications(@Param("search") String search, Pageable pageable);
    
    @Query("SELECT m FROM Medication m WHERE m.stockQuantity <= m.minimumStock AND m.isActive = true")
    List<Medication> findLowStockMedications();
    
    @Query("SELECT m FROM Medication m WHERE m.expiryDate <= CURRENT_TIMESTAMP AND m.isActive = true")
    List<Medication> findExpiredMedications();
}
