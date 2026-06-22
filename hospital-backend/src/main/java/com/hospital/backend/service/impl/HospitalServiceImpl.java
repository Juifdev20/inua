package com.hospital.backend.service.impl;

import com.hospital.backend.dto.HospitalDTO;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.HospitalRepository;
import com.hospital.backend.service.HospitalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HospitalServiceImpl implements HospitalService {

    private final HospitalRepository hospitalRepository;

    @Override
    public List<HospitalDTO> getAllHospitals() {
        return hospitalRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public HospitalDTO getHospitalById(Long id) {
        Hospital h = getEntityById(id);
        return toDTO(h);
    }

    @Override
    @Transactional
    public HospitalDTO createHospital(HospitalDTO dto) {
        if (hospitalRepository.existsByCode(dto.getCode())) {
            throw new BadRequestException("Un hopital avec le code '" + dto.getCode() + "' existe deja");
        }
        Hospital h = Hospital.builder()
                .nom(dto.getNom())
                .code(dto.getCode().toUpperCase())
                .address(dto.getAddress())
                .city(dto.getCity())
                .country(dto.getCountry())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .logoUrl(dto.getLogoUrl())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .subscriptionPlan(dto.getSubscriptionPlan() != null ? dto.getSubscriptionPlan() : "STANDARD")
                .maxUsers(dto.getMaxUsers() != null ? dto.getMaxUsers() : 100)
                .adminEmail(dto.getAdminEmail())
                .notes(dto.getNotes())
                .build();
        Hospital saved = hospitalRepository.save(h);
        log.info("[Hospital] Nouvel hopital cree: {} ({})", saved.getNom(), saved.getCode());
        return toDTO(saved);
    }

    @Override
    @Transactional
    public HospitalDTO updateHospital(Long id, HospitalDTO dto) {
        Hospital h = getEntityById(id);
        if (dto.getNom() != null) h.setNom(dto.getNom());
        if (dto.getAddress() != null) h.setAddress(dto.getAddress());
        if (dto.getCity() != null) h.setCity(dto.getCity());
        if (dto.getCountry() != null) h.setCountry(dto.getCountry());
        if (dto.getPhone() != null) h.setPhone(dto.getPhone());
        if (dto.getEmail() != null) h.setEmail(dto.getEmail());
        if (dto.getLogoUrl() != null) h.setLogoUrl(dto.getLogoUrl());
        if (dto.getSubscriptionPlan() != null) h.setSubscriptionPlan(dto.getSubscriptionPlan());
        if (dto.getMaxUsers() != null) h.setMaxUsers(dto.getMaxUsers());
        if (dto.getAdminEmail() != null) h.setAdminEmail(dto.getAdminEmail());
        if (dto.getNotes() != null) h.setNotes(dto.getNotes());
        return toDTO(hospitalRepository.save(h));
    }

    @Override
    @Transactional
    public void toggleHospitalStatus(Long id) {
        Hospital h = getEntityById(id);
        if (id == 1L) throw new BadRequestException("L'hopital principal ne peut pas etre desactive");
        h.setIsActive(!Boolean.TRUE.equals(h.getIsActive()));
        hospitalRepository.save(h);
        log.info("[Hospital] Statut hopital {} -> {}", h.getNom(), h.getIsActive());
    }

    @Override
    @Transactional
    public void deleteHospital(Long id) {
        if (id == 1L) throw new BadRequestException("L'hopital principal ne peut pas etre supprime");
        Hospital h = getEntityById(id);
        hospitalRepository.delete(h);
    }

    @Override
    public Hospital getEntityById(Long id) {
        return hospitalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hopital non trouve avec id: " + id));
    }

    private HospitalDTO toDTO(Hospital h) {
        long users = hospitalRepository.countUsersByHospitalId(h.getId());
        long patients = hospitalRepository.countPatientsByHospitalId(h.getId());
        return HospitalDTO.builder()
                .id(h.getId())
                .nom(h.getNom())
                .code(h.getCode())
                .address(h.getAddress())
                .city(h.getCity())
                .country(h.getCountry())
                .phone(h.getPhone())
                .email(h.getEmail())
                .logoUrl(h.getLogoUrl())
                .isActive(h.getIsActive())
                .subscriptionPlan(h.getSubscriptionPlan())
                .maxUsers(h.getMaxUsers())
                .adminEmail(h.getAdminEmail())
                .notes(h.getNotes())
                .createdAt(h.getCreatedAt())
                .updatedAt(h.getUpdatedAt())
                .totalUsers(users)
                .totalPatients(patients)
                .build();
    }
}
