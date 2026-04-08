package com.hospital.backend.controller;

import com.hospital.backend.entity.*;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.ConsultationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/v1/doctors", "/api/v1/doctor"})
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
@Slf4j
public class DoctorController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ConsultationRepository consultationRepository;

    @Autowired
    private MedicalRecordRepository medicalRecordRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private PrescribedExamRepository prescribedExamRepository;

    @Autowired
    private ConsultationService consultationService;

    @Autowired
    private MedicalServiceRepository medicalServiceRepository;

    // ══════════════════════════════════════════════════════════════════
    // ✅ GET /consultations
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/consultations")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR')")
    public ResponseEntity<List<Map<String, Object>>> getConsultations(Authentication authentication) {
        try {
            String identifier = authentication.getName();
            log.info("🔍 Récupération consultations pour: {}", identifier);

            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .orElseThrow(() -> new RuntimeException("Docteur non trouvé"));

            List<Consultation> consultations = consultationRepository.findByDoctorIdWithDetails(doctorUser.getId());

            List<Map<String, Object>> result = consultations.stream()
                    .map(c -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", c.getId());
                        map.put("consultationDate", c.getCreatedAt() != null ? c.getCreatedAt() : c.getConsultationDate());
                        map.put("status", c.getStatus());
                        map.put("reasonForVisit", c.getReasonForVisit());
                        map.put("motif", c.getReasonForVisit());
                        map.put("admissionId", c.getAdmission() != null ? c.getAdmission().getId() : null);

                        map.put("poids", c.getPoids());
                        map.put("temperature", c.getTemperature());
                        map.put("taille", c.getTaille());
                        map.put("tensionArterielle", c.getTensionArterielle());

                        if (c.getAdmission() != null) {
                            Admission admission = c.getAdmission();
                            if (admission.getPoids() != null) map.put("poids", admission.getPoids());
                            if (admission.getTemperature() != null) map.put("temperature", admission.getTemperature());
                            if (admission.getTaille() != null) map.put("taille", admission.getTaille());
                            if (admission.getTensionArterielle() != null) map.put("tensionArterielle", admission.getTensionArterielle());
                        }

                        if (c.getPatient() != null) {
                            Patient p = c.getPatient();
                            map.put("patientId", p.getId());
                            map.put("patientName", p.getFirstName() + " " + p.getLastName());

                            String patientPhotoUrl = p.getPhotoUrl();
                            if (patientPhotoUrl != null && !patientPhotoUrl.isEmpty()) {
                                patientPhotoUrl = patientPhotoUrl.replace("/uploads//uploads/", "/uploads/")
                                        .replace("/profiles//uploads/", "/uploads/")
                                        .replace("profiles//uploads/", "/uploads/");
                                map.put("patientPhoto", patientPhotoUrl);
                            } else {
                                map.put("patientPhoto", "/uploads/default-patient.png");
                            }
                        }

                        return map;
                    })
                    .collect(Collectors.toList());

            log.info("✅ {} consultations trouvées", result.size());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("❌ Erreur getConsultations: {}", e.getMessage(), e);
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ✅ GET /patients
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/patients")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<List<Map<String, Object>>> getMyPatients(Authentication authentication) {
        try {
            String identifier = authentication.getName();
            log.info("🔍 Récupération patients pour: {}", identifier);

            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElse(null);

            if (doctorUser == null) {
                return ResponseEntity.status(404).build();
            }

            List<Consultation> consultations = consultationRepository.findByDoctorIdWithDetails(doctorUser.getId());

            consultations.sort((a, b) -> {
                LocalDateTime da = a.getConsultationDate() != null ? a.getConsultationDate() : a.getCreatedAt();
                LocalDateTime db = b.getConsultationDate() != null ? b.getConsultationDate() : b.getCreatedAt();
                return db != null && da != null ? db.compareTo(da) : 0;
            });

            Map<Long, Map<String, Object>> uniquePatients = new HashMap<>();

            for (Consultation c : consultations) {
                if (c.getPatient() != null) {
                    Patient p = c.getPatient();
                    Long pId = p.getId();

                    if (!uniquePatients.containsKey(pId)) {
                        Map<String, Object> pData = new HashMap<>();
                        pData.put("id", pId);
                        pData.put("prenom", p.getFirstName());
                        pData.put("nom", p.getLastName());
                        pData.put("telephone", p.getPhoneNumber());
                        pData.put("date_naissance", p.getDateOfBirth());
                        pData.put("groupe_sanguin", p.getBloodType());
                        pData.put("photo", p.getPhotoUrl());
                        pData.put("email", p.getEmail());
                        pData.put("assurance", p.getInsuranceProvider());
                        pData.put("tension", c.getTensionArterielle());
                        pData.put("poids", c.getPoids());
                        pData.put("temperature", c.getTemperature());

                        uniquePatients.put(pId, pData);
                    }
                }
            }

            log.info("✅ {} patients uniques trouvés", uniquePatients.size());
            return ResponseEntity.ok(new ArrayList<>(uniquePatients.values()));

        } catch (Exception e) {
            log.error("❌ Erreur getMyPatients: {}", e.getMessage(), e);
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ✅ TERMINER CONSULTATION (POST + PUT) — UTILISE EN_ATTENTE (VALIDE DB)
    // ══════════════════════════════════════════════════════════════════

    @RequestMapping(
            value = "/consultations/{id}/terminer",
            method = {RequestMethod.POST, RequestMethod.PUT}
    )
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR')")
    @Transactional
    public ResponseEntity<Map<String, Object>> terminerConsultation(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication) {

        log.info("🔬 ========== TERMINAISON CONSULTATION {} ==========", id);
        log.info("📦 Payload reçu: {}", payload);

        try {
            String identifier = authentication.getName();
            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .orElseThrow(() -> new RuntimeException("Docteur non trouvé"));

            Consultation consultation = consultationRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Consultation non trouvée: " + id));

            if (consultation.getDoctor() == null || !consultation.getDoctor().getId().equals(doctorUser.getId())) {
                log.warn("❌ Docteur {} non assigné à la consultation {}", doctorUser.getId(), id);
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Vous n'êtes pas assigné à cette consultation"
                ));
            }

            String diagnostic = (String) payload.get("diagnostic");
            String traitement = (String) payload.get("traitement");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> exams = (List<Map<String, Object>>) payload.get("exams");

            log.info("📝 Diagnostic: {}, Traitement: {}, #Examens: {}",
                    diagnostic, traitement, exams != null ? exams.size() : 0);

            // Mise à jour des champs
            consultation.setDiagnosis(diagnostic);
            consultation.setTreatment(traitement);

            boolean hasExams = exams != null && !exams.isEmpty();

            if (hasExams) {
                log.info("💊 Création de {} examen(s) prescrits", exams.size());
                for (Map<String, Object> examData : exams) {
                    createAndSaveExam(consultation, examData);
                }

                // ✅ UTILISE EN_ATTENTE (VALIDE SELON VOTRE CONTRAINT DB)
                // Une fois la DB mise à jour, remplacez par EXAMENS_PRESCRITS
                consultation.setStatus(ConsultationStatus.EN_ATTENTE);
                log.info("📌 Statut consultation {} → EN_ATTENTE (examens prescrits)", id);
            } else {
                consultation.setStatus(ConsultationStatus.TERMINE);
                log.info("📌 Statut consultation {} → TERMINE (aucun examen)", id);
            }

            // ✅ DATE DE CLÔTURE - enregistrer quand le docteur finalise
            consultation.setDateCloture(LocalDateTime.now());
            Consultation saved = consultationRepository.save(consultation);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", hasExams
                            ? "Consultation terminée. Examens envoyés à la caisse."
                            : "Consultation terminée avec succès.",
                    "consultationId", id,
                    "status", saved.getStatus().name(),
                    "hasExams", hasExams
            ));

        } catch (Exception e) {
            log.error("❌ ERREUR terminaison consultation {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // MÉTHODE UTILITAIRE : création des PrescribedExam (corrigée)
    // ══════════════════════════════════════════════════════════════════

    private void createAndSaveExam(Consultation consultation, Map<String, Object> examData) {
        try {
            Long serviceId = Long.valueOf(examData.get("serviceId").toString());
            String note = (String) examData.getOrDefault("note", "");

            log.info("🧪 Création examen pour serviceId={} note='{}'", serviceId, note);

            PrescribedExam exam = new PrescribedExam();
            exam.setConsultation(consultation);
            exam.setServiceName("Service #" + serviceId);
            exam.setUnitPrice(BigDecimal.ZERO);
            exam.setQuantity(1);
            exam.setTotalPrice(BigDecimal.ZERO);
            exam.setDoctorNote(note);
            exam.setActive(true);
            exam.setCreatedAt(LocalDateTime.now());

            // ✅ On récupère le vrai service pour nom + prix
            medicalServiceRepository.findById(serviceId).ifPresent(service -> {
                exam.setService(service);
                exam.setServiceName(service.getNom());
                if (service.getPrix() != null) {
                    BigDecimal prix = BigDecimal.valueOf(service.getPrix());
                    exam.setUnitPrice(prix);
                    exam.setTotalPrice(prix);
                }
                log.info("✅ Service trouvé pour examen: {} ({} CDF)", service.getNom(), service.getPrix());
            });

            prescribedExamRepository.save(exam);
            log.info("✅ Examen prescrit sauvegardé (ID={}) pour consultation {}", exam.getId(), consultation.getId());

        } catch (Exception e) {
            log.error("❌ Erreur création examen prescrit: {}", e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // AUTRES MÉTHODES (inchangées)
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<Map<String, Object>> getCurrentDoctor(Authentication authentication) {
        try {
            String identifier = authentication.getName();
            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElse(null);

            if (doctorUser == null) {
                return ResponseEntity.status(404).build();
            }

            Map<String, Object> doctorInfo = new HashMap<>();
            doctorInfo.put("id", doctorUser.getId());
            doctorInfo.put("firstName", doctorUser.getFirstName());
            doctorInfo.put("lastName", doctorUser.getLastName());
            doctorInfo.put("email", doctorUser.getEmail());
            doctorInfo.put("photoUrl", doctorUser.getPhotoUrl());
            doctorInfo.put("phoneNumber", doctorUser.getPhoneNumber());

            return ResponseEntity.ok(doctorInfo);
        } catch (Exception e) {
            log.error("Erreur getCurrentDoctor: {}", e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<Map<String, Object>> getDoctorDashboard(Authentication authentication) {
        try {
            String identifier = authentication.getName();
            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElse(null);

            if (doctorUser == null) {
                return ResponseEntity.status(404).build();
            }

            Long doctorId = doctorUser.getId();
            String doctorEmail = doctorUser.getEmail();

            LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
            LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

            Map<String, Object> response = new HashMap<>();
            Map<String, Object> stats = new HashMap<>();

            try {
                stats.put("total_patients", patientRepository.countByDoctorEmail(doctorEmail));
            } catch (Exception e) {
                stats.put("total_patients", 0);
            }

            try {
                stats.put("rdvs_today_count", consultationRepository.countTodayConsultationsByDoctorId(doctorId, startOfDay, endOfDay));
            } catch (Exception e) {
                stats.put("rdvs_today_count", 0);
            }

            try {
                stats.put("consultations_pending", consultationRepository.countByDoctorIdAndStatus(doctorId, ConsultationStatus.EN_ATTENTE));
            } catch (Exception e) {
                stats.put("consultations_pending", 0);
            }

            stats.put("unread_messages", 0);
            response.put("stats", stats);

            List<Consultation> allConsultations = consultationRepository.findByDoctorIdWithDetails(doctorId);

            List<Map<String, Object>> fullRdvsList = allConsultations.stream()
                    .map(c -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", c.getId());
                        map.put("consultationDate", c.getConsultationDate());
                        map.put("reasonForVisit", c.getReasonForVisit() != null ? c.getReasonForVisit() : "Consultation");
                        map.put("status", c.getStatus() != null ? c.getStatus().toString() : "UNKNOWN");

                        if (c.getPatient() != null) {
                            Patient p = c.getPatient();
                            map.put("patientId", p.getId());
                            map.put("patientName", p.getFirstName() + " " + p.getLastName());

                            Map<String, Object> patientDetail = new HashMap<>();
                            patientDetail.put("id", p.getId());
                            patientDetail.put("nom", p.getLastName());
                            patientDetail.put("prenom", p.getFirstName());
                            patientDetail.put("telephone", p.getPhoneNumber());
                            patientDetail.put("date_naissance", p.getDateOfBirth());
                            patientDetail.put("groupe_sanguin", p.getBloodType());
                            patientDetail.put("photo", p.getPhotoUrl());
                            map.put("patient", patientDetail);
                        }
                        return map;
                    }).collect(Collectors.toList());

            response.put("rdvs_today", fullRdvsList);

            try {
                List<Consultation> recent = consultationRepository.findRecentByDoctorId(doctorId, PageRequest.of(0, 5));
                response.put("recent_consultations", recent.stream().map(c -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", c.getId());
                    map.put("consultationDate", c.getConsultationDate());
                    map.put("patientName", c.getPatient() != null ? c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Inconnu");
                    map.put("diagnosis", c.getDiagnosis());

                    if (c.getPatient() != null) {
                        Patient p = c.getPatient();
                        Map<String, Object> pDetail = new HashMap<>();
                        pDetail.put("id", p.getId());
                        pDetail.put("nom", p.getLastName());
                        pDetail.put("prenom", p.getFirstName());
                        pDetail.put("telephone", p.getPhoneNumber());
                        pDetail.put("date_naissance", p.getDateOfBirth());
                        map.put("patient", pDetail);
                    }
                    return map;
                }).collect(Collectors.toList()));
            } catch (Exception e) {
                response.put("recent_consultations", new ArrayList<>());
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur getDoctorDashboard: {}", e.getMessage());
            return ResponseEntity.status(500).body(new HashMap<>());
        }
    }

    @GetMapping("/patients/{id}")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<?> getPatientById(@PathVariable Long id) {
        try {
            return patientRepository.findById(id)
                    .map(p -> {
                        Map<String, Object> pData = new HashMap<>();
                        pData.put("id", p.getId());
                        pData.put("prenom", p.getFirstName());
                        pData.put("nom", p.getLastName());
                        pData.put("telephone", p.getPhoneNumber());
                        pData.put("date_naissance", p.getDateOfBirth());
                        pData.put("groupe_sanguin", p.getBloodType());
                        pData.put("photo", p.getPhotoUrl());
                        pData.put("email", p.getEmail());
                        pData.put("assurance", p.getInsuranceProvider());
                        pData.put("genre", p.getGender());
                        pData.put("adresse", p.getAddress());
                        return ResponseEntity.ok(pData);
                    })
                    .orElse(ResponseEntity.status(404).body(Collections.singletonMap("message", "Patient non trouvé")));
        } catch (Exception e) {
            log.error("Erreur getPatientById: {}", e.getMessage());
            return ResponseEntity.status(500).body(Collections.singletonMap("error", "Erreur serveur"));
        }
    }

    @GetMapping("/appointments")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<Map<String, Object>> getPatientsFromAppointments(Authentication authentication) {
        try {
            ResponseEntity<List<Map<String, Object>>> patientsResponse = getMyPatients(authentication);
            List<Map<String, Object>> patientsList = patientsResponse.getBody();

            List<Map<String, Object>> appointmentsList = new ArrayList<>();
            if (patientsList != null) {
                for (Map<String, Object> p : patientsList) {
                    Map<String, Object> app = new HashMap<>();
                    app.put("patient", p);
                    appointmentsList.add(app);
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("appointments", appointmentsList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erreur getPatientsFromAppointments: {}", e.getMessage());
            return ResponseEntity.status(500).body(new HashMap<>());
        }
    }

    @GetMapping("/documents")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<?> getMyDocuments(Authentication authentication) {
        try {
            String identifier = authentication.getName();
            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElse(null);

            if (doctorUser == null) return ResponseEntity.status(404).body("Docteur non trouvé");

            List<MedicalRecord> records = medicalRecordRepository.findByDoctorId(doctorUser.getId());

            List<Map<String, Object>> docs = records.stream()
                    .filter(r -> r.getNotes() != null && r.getNotes().contains("uploads/"))
                    .map(r -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", r.getId());
                        map.put("titre", r.getDiagnosis());
                        map.put("typeDocument", r.getTreatment());
                        map.put("fileUrl", r.getNotes());
                        map.put("createdAt", r.getCreatedAt());
                        if (r.getPatient() != null) {
                            map.put("patientName", r.getPatient().getFirstName() + " " + r.getPatient().getLastName());
                            map.put("patientId", r.getPatient().getId());
                        }
                        return map;
                    }).collect(Collectors.toList());

            return ResponseEntity.ok(docs);
        } catch (Exception e) {
            log.error("Erreur getMyDocuments: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    @PostMapping("/documents/upload")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("patientId") Long patientId,
            @RequestParam("titre") String titre,
            @RequestParam("typeDocument") String typeDocument,
            Authentication authentication) {

        try {
            String identifier = authentication.getName();
            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElse(null);

            Patient patient = patientRepository.findById(patientId).orElse(null);

            if (doctorUser == null || patient == null) {
                return ResponseEntity.status(404).body("Docteur ou Patient non trouvé");
            }

            String uploadDir = "uploads/medical_docs/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            MedicalRecord record = MedicalRecord.builder()
                    .patient(patient)
                    .doctor(doctorUser)
                    .diagnosis(titre)
                    .notes("/" + uploadDir + fileName)
                    .treatment(typeDocument)
                    .status(RecordStatus.TERMINE)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .recordCode("DOC-" + System.currentTimeMillis())
                    .build();

            medicalRecordRepository.save(record);

            Map<String, Object> result = new HashMap<>();
            result.put("message", "Document enregistré avec succès");
            result.put("fileUrl", record.getNotes());

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Erreur uploadDocument: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erreur serveur : " + e.getMessage());
        }
    }

    @PostMapping("/me/photo")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<?> updateDoctorPhoto(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            String identifier = authentication.getName();
            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElse(null);

            if (doctorUser == null) {
                return ResponseEntity.status(404).body("Docteur non trouvé");
            }

            String uploadDir = "uploads/doctors/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String fileName = "doc_" + doctorUser.getId() + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String photoUrl = "/" + uploadDir + fileName;
            doctorUser.setPhotoUrl(photoUrl);
            userRepository.save(doctorUser);

            return ResponseEntity.ok(Map.of(
                    "message", "Photo mise à jour avec succès",
                    "photoUrl", photoUrl
            ));
        } catch (Exception e) {
            log.error("Erreur updateDoctorPhoto: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erreur serveur: " + e.getMessage());
        }
    }

    @DeleteMapping("/documents/{id}")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        try {
            medicalRecordRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Document supprimé"));
        } catch (Exception e) {
            log.error("Erreur deleteDocument: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erreur suppression");
        }
    }

    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> getAllDoctors() {
        try {
            Optional<Role> doctorRole = roleRepository.findByNom("DOCTEUR")
                    .or(() -> roleRepository.findByNom("ROLE_DOCTEUR"));

            if (doctorRole.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            List<User> doctors = userRepository.findByRole(doctorRole.get());

            return ResponseEntity.ok(doctors.stream()
                    .filter(doc -> doc != null && Boolean.TRUE.equals(doc.getIsActive()))
                    .map(doc -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", doc.getId());
                        map.put("firstName", doc.getFirstName());
                        map.put("lastName", doc.getLastName());
                        map.put("email", doc.getEmail());

                        String specialite = "Médecin Généraliste";
                        try {
                            if (doc.getDepartment() != null) {
                                specialite = doc.getDepartment().getNom().toUpperCase();
                            }
                        } catch (Exception e) {
                            log.debug("Département non disponible");
                        }

                        map.put("specialty", specialite);
                        map.put("photoUrl", doc.getPhotoUrl() != null ? doc.getPhotoUrl() : "");
                        return map;
                    })
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("Erreur getAllDoctors: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @PostMapping("/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> addDoctor(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(Map.of("message", "Docteur configuré avec succès !"));
    }

    @GetMapping("/conversations/{patientId}")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<?> getConversation(@PathVariable Long patientId, Authentication authentication) {
        try {
            String identifier = authentication.getName();
            User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElse(null);

            if (doctorUser == null) return ResponseEntity.status(404).body("Docteur non trouvé");

            List<ChatMessage> messages = chatMessageRepository.findConversationBetween(doctorUser.getId(), patientId);

            List<Map<String, Object>> responseData = messages.stream().map(m -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", m.getId());
                map.put("contenu", m.getContent());
                map.put("sender_type", m.getSender().getId().equals(doctorUser.getId()) ? "doctor" : "patient");
                map.put("created_at", m.getCreatedAt());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(responseData);
        } catch (Exception e) {
            log.error("Erreur getConversation: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erreur récupération chat: " + e.getMessage());
        }
    }

    @PostMapping("/messages/send")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            String identifier = authentication.getName();
            User sender = userRepository.findByEmail(identifier)
                    .or(() -> userRepository.findByUsername(identifier))
                    .orElse(null);

            if (sender == null) return ResponseEntity.status(404).body("Expéditeur non trouvé");

            Long patientId = Long.valueOf(payload.get("patientId").toString());
            User receiver = userRepository.findById(patientId)
                    .orElseThrow(() -> new RuntimeException("Destinataire (patient) non trouvé"));

            String contenu = (String) payload.get("contenu");

            ChatMessage message = ChatMessage.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .content(contenu)
                    .createdAt(LocalDateTime.now())
                    .isRead(false)
                    .build();

            ChatMessage saved = chatMessageRepository.save(message);

            Map<String, Object> result = new HashMap<>();
            result.put("id", saved.getId());
            result.put("contenu", saved.getContent());
            result.put("sender_type", "doctor");
            result.put("created_at", saved.getCreatedAt());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Erreur sendMessage: {}", e.getMessage());
            return ResponseEntity.status(500).body("Erreur envoi message: " + e.getMessage());
        }
    }
}