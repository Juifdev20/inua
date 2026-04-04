package com.hospital.backend.service;

import com.hospital.backend.entity.Attendance;
import com.hospital.backend.entity.Employee;
import com.hospital.backend.repository.AttendanceRepository;
import com.hospital.backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public Attendance markCheckIn(Long employeeId) {
        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employé non trouvé avec l'ID : " + employeeId));

        LocalDateTime startOfDay = LocalDateTime.now().with(LocalTime.MIN);
        if (attendanceRepository.findTodayAttendance(employeeId, startOfDay).isPresent()) {
            throw new RuntimeException("L'employé a déjà pointé son arrivée aujourd'hui.");
        }

        Attendance attendance = Attendance.builder()
                .employee(emp)
                .checkIn(LocalDateTime.now())
                .status("PRESENT")
                .build();

        return attendanceRepository.save(attendance);
    }

    @Transactional
    public Attendance markCheckOut(Long employeeId) {
        LocalDateTime startOfDay = LocalDateTime.now().with(LocalTime.MIN);
        Attendance attendance = attendanceRepository.findTodayAttendance(employeeId, startOfDay)
                .orElseThrow(() -> new RuntimeException("Aucun pointage d'arrivée trouvé pour aujourd'hui."));

        if (attendance.getCheckOut() != null) {
            throw new RuntimeException("Le pointage de départ a déjà été effectué.");
        }

        attendance.setCheckOut(LocalDateTime.now());
        attendance.calculateWorkHours();

        return attendanceRepository.save(attendance);
    }

    public List<Attendance> getAllAttendanceToday() {
        LocalDateTime startOfDay = LocalDateTime.now().with(LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.now().with(LocalTime.MAX);

        return attendanceRepository.findAll().stream()
                .filter(a -> a.getCheckIn().isAfter(startOfDay) && a.getCheckIn().isBefore(endOfDay))
                .collect(Collectors.toList());
    }
}