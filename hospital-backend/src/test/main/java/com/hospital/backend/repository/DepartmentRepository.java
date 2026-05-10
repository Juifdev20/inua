package com.hospital.backend.repository;

import com.hospital.backend.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    // Cette méthode doit exister car votre service Auth l'appelle
    Optional<Department> findByNom(String nom);
}