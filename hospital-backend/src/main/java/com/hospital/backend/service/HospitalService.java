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
}
