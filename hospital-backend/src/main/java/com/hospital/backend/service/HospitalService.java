package com.hospital.backend.service;

import com.hospital.backend.dto.HospitalDTO;
import com.hospital.backend.entity.Hospital;

import java.util.List;

public interface HospitalService {
    List<HospitalDTO> getAllHospitals();
    HospitalDTO getHospitalById(Long id);
    HospitalDTO createHospital(HospitalDTO dto);
    HospitalDTO updateHospital(Long id, HospitalDTO dto);
    void toggleHospitalStatus(Long id);
    void deleteHospital(Long id);
    Hospital getEntityById(Long id);

    // ═══════════════════════════════════════════════════
    // INSCRIPTION PUBLIQUE / WORKFLOW D'APPROBATION
    // ═══════════════════════════════════════════════════

    /** Demande publique d'inscription d'un hôpital (statut PENDING, inactif). Notifie les superadmins. */
    HospitalDTO registerPublic(HospitalDTO dto);

    /** Liste des demandes d'inscription en attente d'approbation. */
    List<HospitalDTO> getPendingRegistrations();

    /** Change le statut d'inscription (APPROVED / REJECTED) et active/désactive en conséquence. */
    HospitalDTO setRegistrationStatus(Long id, String status, String rejectionReason);
}
