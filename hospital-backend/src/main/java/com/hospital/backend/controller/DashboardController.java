package com.hospital.backend.controller;

import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.repository.ActivityRepository;
import com.hospital.backend.repository.DepartmentRepository; // 1. Ajoutez cet import
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private DepartmentRepository departmentRepository; // 2. Injectez le repository des départements

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        Map<String, Object> stats = new HashMap<>();

        stats.put("totalUsers", userRepository.count());
        stats.put("newUsersMonth", userRepository.countAllNewUsersSince(startOfMonth));
        stats.put("totalDoctors", userRepository.countByRoleNom("DOCTEUR"));
        stats.put("newDoctorsMonth", userRepository.countNewUsersByRoleSince("DOCTEUR", startOfMonth));
        stats.put("totalPatients", userRepository.countByRoleNom("PATIENT"));
        stats.put("newPatientsMonth", userRepository.countNewUsersByRoleSince("PATIENT", startOfMonth));

        // 3. CORRECTION : Remplacez 11 par le vrai décompte de la base de données
        stats.put("totalDepartments", departmentRepository.count());

        // Récupération des 5 dernières activités réelles
        stats.put("activities", activityRepository.findTop5ByOrderByDateDesc());

        return ResponseEntity.ok(stats);
    }
}