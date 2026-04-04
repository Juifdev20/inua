package com.hospital.backend.repository;

import com.hospital.backend.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    // Récupérer le pointage du jour pour un employé spécifique
    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :empId AND a.checkIn >= :startOfDay")
    Optional<Attendance> findTodayAttendance(@Param("empId") Long empId, @Param("startOfDay") LocalDateTime startOfDay);
}
