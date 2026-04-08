package com.hospital.backend.controller;

import com.hospital.backend.entity.MedicalService;
import com.hospital.backend.repository.MedicalServiceRepository;
import com.hospital.backend.service.ActivityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/services")
// On autorise explicitement le frontend et les headers d'autorisation
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class MedicalServiceController {

    @Autowired
    private MedicalServiceRepository serviceRepository;

    @Autowired
    private ActivityService activityService;

    @GetMapping("/all")
    public List<MedicalService> getAllServices() {
        return serviceRepository.findAll();
    }

    @PostMapping("/create")
    public MedicalService createService(@RequestBody MedicalService medicalService) {
        // Sécurité pour le statut par défaut
        if (medicalService.getIsActive() == null) medicalService.setIsActive(true);

        MedicalService saved = serviceRepository.save(medicalService);
        activityService.log("Nouveau Service", "Ajout de : " + saved.getNom(), "success");
        return saved;
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicalService> updateService(@PathVariable Long id, @RequestBody MedicalService details) {
        return serviceRepository.findById(id).map(s -> {
            s.setNom(details.getNom());
            s.setDescription(details.getDescription());
            s.setPrix(details.getPrix());
            s.setDuree(details.getDuree());
            s.setDepartement(details.getDepartement());
            s.setIsActive(details.getIsActive());

            MedicalService updated = serviceRepository.save(s);
            activityService.log("Mise à jour Service", "Modif de : " + updated.getNom(), "info");
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteService(@PathVariable Long id) {
        return serviceRepository.findById(id).map(s -> {
            String name = s.getNom();
            serviceRepository.delete(s);
            activityService.log("Suppression Service", "Retrait de : " + name, "warning");
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}