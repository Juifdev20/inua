package com.hospital.backend.controller;

import com.hospital.backend.entity.Department;
import com.hospital.backend.repository.DepartmentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/departments")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
@Slf4j // Pour voir les erreurs dans la console
public class DepartmentController {

    @Autowired
    private DepartmentRepository departmentRepository;

    // --- RÉCUPÉRER TOUT ---
    @GetMapping("/all")
    public ResponseEntity<List<Department>> getAll() {
        try {
            return ResponseEntity.ok(departmentRepository.findAll());
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des départements", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- CRÉER ---
    @PostMapping("/create")
    public ResponseEntity<?> create(@RequestBody Department dept) {
        try {
            log.info("Tentative de création du département : {}", dept.getNom());

            // Sécurité : on s'assure que les nombres ne sont pas nuls avant de sauvegarder
            if (dept.getNombrePersonnel() == null) dept.setNombrePersonnel(0);
            if (dept.getNombreLits() == null) dept.setNombreLits(0);

            Department savedDept = departmentRepository.save(dept);
            return ResponseEntity.ok(savedDept);
        } catch (Exception e) {
            log.error("ERREUR CRÉATION DÉPARTEMENT: ", e);
            // On renvoie le message d'erreur précis pour aider au debug
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Erreur SQL ou mapping : " + e.getMessage()
            ));
        }
    }

    // --- MODIFIER (Optionnel mais recommandé pour ton CRUD) ---
    @PutMapping("/update/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Department deptDetails) {
        return departmentRepository.findById(id).map(dept -> {
            dept.setNom(deptDetails.getNom());
            dept.setDescription(deptDetails.getDescription());
            dept.setChef(deptDetails.getChef());
            dept.setNombrePersonnel(deptDetails.getNombrePersonnel());
            dept.setNombreLits(deptDetails.getNombreLits());
            dept.setEtage(deptDetails.getEtage());
            dept.setTelephone(deptDetails.getTelephone());
            dept.setActif(deptDetails.isActif());

            Department updated = departmentRepository.save(dept);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- SUPPRIMER (Optionnel mais recommandé) ---
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            departmentRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Département supprimé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Impossible de supprimer le département"));
        }
    }
}