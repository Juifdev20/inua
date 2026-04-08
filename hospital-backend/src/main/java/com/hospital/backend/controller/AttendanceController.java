package com.hospital.backend.controller;

import com.hospital.backend.entity.Attendance;
import com.hospital.backend.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class AttendanceController {

    private final AttendanceService attendanceService;

    // Enregistrer l'arrivée
    @PostMapping("/check-in/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RH', 'MEDECIN', 'LABO', 'PHARMACIE')")
    public ResponseEntity<Attendance> checkIn(@PathVariable Long employeeId) {
        return ResponseEntity.ok(attendanceService.markCheckIn(employeeId));
    }

    // Enregistrer le départ
    @PostMapping("/check-out/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RH', 'MEDECIN', 'LABO', 'PHARMACIE')")
    public ResponseEntity<Attendance> checkOut(@PathVariable Long employeeId) {
        return ResponseEntity.ok(attendanceService.markCheckOut(employeeId));
    }

    // Voir tous les pointages du jour (Réservé Admin et RH)
    @GetMapping("/today")
    @PreAuthorize("hasAnyRole('ADMIN', 'RH')")
    public ResponseEntity<List<Attendance>> getTodayAttendance() {
        return ResponseEntity.ok(attendanceService.getAllAttendanceToday());
    }
}