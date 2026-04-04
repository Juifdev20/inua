package com.hospital.backend.repository;

import com.hospital.backend.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    
    Optional<Employee> findByEmployeeCode(String employeeCode);
    
    Optional<Employee> findByUserId(Long userId);
    
    List<Employee> findByDepartment(String department);
    
    Page<Employee> findByIsActiveTrue(Pageable pageable);
    
    @Query("SELECT e FROM Employee e WHERE " +
           "LOWER(e.user.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.user.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Employee> searchEmployees(@Param("search") String search, Pageable pageable);
    
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.isActive = true")
    Long countActiveEmployees();
    
    @Query("SELECT e.department, COUNT(e) FROM Employee e WHERE e.isActive = true GROUP BY e.department")
    List<Object[]> countByDepartment();
}
