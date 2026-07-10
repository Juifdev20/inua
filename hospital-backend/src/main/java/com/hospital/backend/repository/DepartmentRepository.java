package com.hospital.backend.repository;

import com.hospital.backend.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    // Cette mÃ©thode doit exister car votre service Auth l'appelle
    Optional<Department> findByNom(String nom);

    // â˜… MULTI-TENANT: filtrer par hÃ´pital
    List<Department> findByHospitalId(Long hospitalId);

    // â˜… MULTI-TENANT: inclure aussi les dÃ©partements legacy sans hÃ´pital
    List<Department> findByHospitalIdOrHospitalIsNull(Long hospitalId);

    // MULTI-TENANT: trouver un departement par nom ET hopital (evite les doublons cross-hospital)
    Optional<Department> findByNomAndHospitalId(String nom, Long hospitalId);

    // MULTI-TENANT: compter les departements d'un hopital (dashboard)
    long countByHospitalId(Long hospitalId);
}
