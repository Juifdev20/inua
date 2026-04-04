package com.hospital.backend.service;

import com.hospital.backend.dto.EmployeeDTO;
import com.hospital.backend.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;

public interface EmployeeService {
    EmployeeDTO create(EmployeeDTO employeeDTO);
    EmployeeDTO update(Long id, EmployeeDTO employeeDTO);
    EmployeeDTO getById(Long id);
    EmployeeDTO getByCode(String code);
    EmployeeDTO getByUserId(Long userId);
    PageResponse<EmployeeDTO> getAll(Pageable pageable);
    PageResponse<EmployeeDTO> search(String query, Pageable pageable);
    List<EmployeeDTO> getByDepartment(String department);
    Map<String, Long> getCountByDepartment();
    Long countActive();
    void delete(Long id);
    void deactivate(Long id);
}
