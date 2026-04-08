package com.hospital.backend.controller;

import com.hospital.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class ChartController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/charts")
    public ResponseEntity<Map<String, Object>> getChartData() {
        Map<String, Object> data = new HashMap<>();

        // 1. Données pour le PieChart (Patients par Département)
        // Note: Ici on simule une répartition, mais on peut la rendre réelle via une requête @Query
        List<Map<String, Object>> patientsDept = Arrays.asList(
                Map.of("nom", "Cardiologie", "valeur", 40),
                Map.of("nom", "Pédiatrie", "valeur", 30),
                Map.of("nom", "Neurologie", "valeur", 20),
                Map.of("nom", "Urgence", "valeur", 10)
        );

        // 2. Données pour le LineChart (Consultations)
        List<Map<String, Object>> consultations = Arrays.asList(
                Map.of("mois", "Jan", "consultations", 45),
                Map.of("mois", "Fév", "consultations", 52),
                Map.of("mois", "Mar", "consultations", 48),
                Map.of("mois", "Avr", "consultations", 70)
        );

        // 3. Données pour le BarChart (Revenu)
        List<Map<String, Object>> revenu = Arrays.asList(
                Map.of("mois", "Jan", "revenu", 12000),
                Map.of("mois", "Fév", "revenu", 15000),
                Map.of("mois", "Mar", "revenu", 11000),
                Map.of("mois", "Avr", "revenu", 19000)
        );

        data.put("patientsParDepartement", patientsDept);
        data.put("consultations", consultations);
        data.put("revenuMensuel", revenu);

        return ResponseEntity.ok(data);
    }
}