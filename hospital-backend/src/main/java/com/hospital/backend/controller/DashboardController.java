package com.hospital.backend.controller;

import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.repository.ActivityRepository;
import com.hospital.backend.repository.DepartmentRepository;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/dashboard")
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private ConsultationRepository consultationRepository;

    @Autowired
    private PatientRepository patientRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getStats() {
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        Map<String, Object> stats = new HashMap<>();

        stats.put("totalUsers", userRepository.count());
        stats.put("newUsersMonth", userRepository.countAllNewUsersSince(startOfMonth));
        // Les rôles sont stockés avec le préfixe ROLE_ (ex: ROLE_DOCTEUR, ROLE_PATIENT)
        stats.put("totalDoctors", userRepository.countByRoleNom("ROLE_DOCTEUR"));
        stats.put("newDoctorsMonth", userRepository.countNewUsersByRoleSince("ROLE_DOCTEUR", startOfMonth));
        stats.put("totalPatients", userRepository.countByRoleNom("ROLE_PATIENT"));
        stats.put("newPatientsMonth", userRepository.countNewUsersByRoleSince("ROLE_PATIENT", startOfMonth));

        // Départements
        stats.put("totalDepartments", departmentRepository.count());

        // RDV en attente (consultations EN_ATTENTE)
        Long pendingCount = consultationRepository.countByStatus(ConsultationStatus.EN_ATTENTE);
        stats.put("pendingAppointments", pendingCount != null ? pendingCount : 0L);

        // Récupération des 5 dernières activités réelles
        stats.put("activities", activityRepository.findTop5ByOrderByDateDesc());

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/charts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getChartsData() {
        Map<String, Object> charts = new HashMap<>();

        // 1. Consultations par mois (6 derniers mois)
        charts.put("consultations", getConsultationsByMonth());

        // 2. Revenu mensuel (simulé avec données de consultations)
        charts.put("revenuMensuel", getRevenueByMonth());

        // Note: patientsParDepartement retiré - non utilisé dans le dashboard actuel

        return ResponseEntity.ok(charts);
    }

    private List<Map<String, Object>> getConsultationsByMonth() {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate now = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM", Locale.FRENCH);

        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            LocalDateTime start = month.withDayOfMonth(1).atStartOfDay();
            LocalDateTime end = month.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);

            long count = consultationRepository.findByDateRange(start, end).size();

            Map<String, Object> data = new HashMap<>();
            data.put("mois", month.format(formatter));
            data.put("consultations", count);
            result.add(data);
        }
        return result;
    }

    private List<Map<String, Object>> getPatientsByDepartment() {
        List<Map<String, Object>> result = new ArrayList<>();
        List<com.hospital.backend.entity.Department> departments = departmentRepository.findAll();

        for (com.hospital.backend.entity.Department dept : departments) {
            Map<String, Object> data = new HashMap<>();
            data.put("name", dept.getNom());
            // Compte approximatif basé sur les consultations par service (departement est un String dans MedicalService)
            long count = consultationRepository.findAll().stream()
                    .filter(c -> c.getService() != null && dept.getNom().equalsIgnoreCase(c.getService().getDepartement()))
                    .map(c -> c.getPatient().getId())
                    .distinct()
                    .count();
            data.put("valeur", count);
            result.add(data);
        }
        return result;
    }

    private List<Map<String, Object>> getRevenueByMonth() {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate now = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM", Locale.FRENCH);

        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            Map<String, Object> data = new HashMap<>();
            data.put("mois", month.format(formatter));
            // Simulation: 50$ par consultation en moyenne
            LocalDateTime start = month.withDayOfMonth(1).atStartOfDay();
            LocalDateTime end = month.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusSeconds(1);
            long consultations = consultationRepository.findByDateRange(start, end).size();
            data.put("revenu", consultations * 50);
            result.add(data);
        }
        return result;
    }
}