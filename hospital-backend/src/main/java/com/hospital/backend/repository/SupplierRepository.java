package com.hospital.backend.repository;

import com.hospital.backend.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    
    Optional<Supplier> findBySupplierCode(String supplierCode);
    
    Optional<Supplier> findByName(String name);
    
    List<Supplier> findByIsActiveTrue();
    
    List<Supplier> findByIsPreferredTrue();
    
    Page<Supplier> findByIsActiveTrue(Pageable pageable);
    
    @Query("SELECT s FROM Supplier s WHERE " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.contactPerson) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.supplierCode) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Supplier> searchSuppliers(@Param("search") String search, Pageable pageable);
    
    @Query("SELECT s FROM Supplier s WHERE s.isActive = true ORDER BY s.isPreferred DESC, s.name ASC")
    List<Supplier> findActiveSuppliersOrderedByPreference();
}
