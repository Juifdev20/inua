// ✅ MÉTHODE mapToDTO SÉCURISÉE À REMPLACER DANS ConsultationServiceImpl.java

@Override
public ConsultationDTO mapToDTO(Consultation c) {
    if (c == null) {
        log.warn("[DEBUG] mapToDTO - Consultation est NULL !");
        return ConsultationDTO.builder().build();
    }
    
    log.info("[DEBUG] mapToDTO - Mapping consultation ID: {}", c.getId());
    
    ConsultationDTO dto = ConsultationDTO.builder()
            .id(c.getId())
            .consultationCode(c.getConsultationCode())
            .patientId(c.getPatient() != null ? c.getPatient().getId() : null)
            .status(c.getStatus())
            .statut(c.getStatut())  // ✅ AJOUT POUR COMPATIBILITÉ FRONTEND
            .decisionNote(c.getDecisionNote())
            .proposedNewDate(c.getProposedNewDate())
            .consultationDate(c.getConsultationDate())
            .reasonForVisit(c.getReasonForVisit())
            .symptoms(c.getSymptoms())
            .diagnosis(c.getDiagnosis())
            .treatment(c.getTreatment())
            .serviceName(c.getService() != null ? c.getService().getNom() : null)
            .servicePrice(c.getService() != null ? c.getService().getPrix() : null)
            // --- FINANCES ---
            .ficheAmountDue(c.getFicheAmountDue())
            .ficheAmountPaid(c.getFicheAmountPaid())
            .examTotalAmount(c.getExamTotalAmount())  // ✅ NOUVEAU
            .consulAmountDue(c.getConsulAmountDue())
            .consulAmountPaid(c.getConsulAmountPaid())
            .createdAt(c.getCreatedAt())
            .updatedAt(c.getUpdatedAt())
            // --- LOGIQUE MOTIF : Priorité admission, fallback consultation, défaut ---
            .motif(getMotif(c))
            // --- PARAMETRES VITAUX : Priorite a l'admission, fallback sur consultation ---
            .poids(getVitalSign(c, "poids"))
            .temperature(getVitalSign(c, "temperature"))
            .taille(getVitalSign(c, "taille"))
            .tensionArterielle(getVitalSign(c, "tensionArterielle"))
            .fraisFiche(c.getFraisFiche())
            // --- SERVICE ---
            .serviceId(c.getService() != null ? c.getService().getId() : null)
            .serviceName(c.getService() != null ? c.getService().getNom() : null)
            .servicePrice(c.getService() != null ? c.getService().getPrix() : null)
            .build();

    // --- INFOS PATIENT ---
    if (c.getPatient() != null) {
        try {
            Patient p = c.getPatient();
            dto.setPatientName(p.getFirstName() + " " + p.getLastName());
            dto.setPhoneNumber(p.getPhoneNumber());
            dto.setGender(p.getGender() != null ? p.getGender().name() : null);
            dto.setProfession(p.getProfession());
            dto.setMaritalStatus(p.getMaritalStatus());
            dto.setBirthPlace(p.getBirthPlace());
            dto.setDateOfBirth(p.getDateOfBirth());
            dto.setReligion(p.getReligion());
            dto.setNationality(p.getNationality());
            
            // ✅ AMÉLIORER: Photo du patient avec logique de nettoyage demandée
            if (p.getPhotoUrl() != null && !p.getPhotoUrl().isEmpty()) {
                String patientPhotoUrl = normalizePhotoUrl(p.getPhotoUrl());
                dto.setPatientPhoto(patientPhotoUrl);
                log.info("📷 [DEBUG] Photo du patient normalisée: {} -> {}", 
                        p.getPhotoUrl(), patientPhotoUrl);
            } else {
                dto.setPatientPhoto("/uploads/default-patient.png");
                log.info("📷 [DEBUG] Photo par défaut du patient: /uploads/default-patient.png");
            }
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur lors du mapping du patient: {}", e.getMessage());
            dto.setPatientName("Patient Inconnu");
            dto.setPatientPhoto("/uploads/default-patient.png");
        }
    } else {
        log.warn("[DEBUG] mapToDTO - Patient est NULL !");
        dto.setPatientName("Patient Inconnu");
        dto.setPatientPhoto("/uploads/default-patient.png");
    }

    // --- INFOS DOCTEUR ---
    if (c.getDoctor() != null) {
        try {
            User d = c.getDoctor();
            dto.setDoctorId(d.getId());
            dto.setDoctorName(d.getFirstName() + " " + d.getLastName());
            dto.setDoctorPhoto(normalizePhotoUrl(d.getPhotoUrl()));
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur lors du mapping du docteur: {}", e.getMessage());
            dto.setDoctorName("Docteur Inconnu");
        }
    } else {
        log.warn("[DEBUG] mapToDTO - Docteur est NULL !");
        dto.setDoctorName("Docteur Inconnu");
    }

    // --- SERVICES ---
    try {
        if (c.getServices() != null && !c.getServices().isEmpty()) {
            List<MedicalServiceDTO> serviceDTOs = c.getServices().stream()
                    .map(service -> {
                        try {
                            return MedicalServiceDTO.builder()
                                    .id(service.getId())
                                    .nom(service.getNom())
                                    .description(service.getDescription())
                                    .prix(service.getPrix())
                                    .departement(service.getDepartement())
                                    .duree(service.getDuree())
                                    .isActive(service.getIsActive())
                                    .build();
                        } catch (Exception e) {
                            log.error("❌ [DEBUG] Erreur lors du mapping du service {}: {}", service.getId(), e.getMessage());
                            return MedicalServiceDTO.builder()
                                    .id(service.getId())
                                    .nom("Service Error")
                                    .build();
                        }
                    })
                    .collect(Collectors.toList());
            dto.setServices(serviceDTOs);
            log.info("🔗 [DEBUG] mapToDTO - {} services mappés", serviceDTOs.size());
        } else {
            dto.setServices(List.of());
            log.debug("🔗 [DEBUG] mapToDTO - Aucun service à mapper");
        }
    } catch (Exception e) {
        log.error("❌ [DEBUG] Erreur lors du mapping des services: {}", e.getMessage());
        dto.setServices(List.of());
    }

    // --- DEBUG DIAGNOSTIC ---
    if (c.getDiagnosis() != null) {
        log.info("[DEBUG] mapToDTO - Diagnostic trouve: {}", c.getDiagnosis());
    } else {
        log.warn("[DEBUG] mapToDTO - Diagnostic est NULL !");
    }

    // --- ADMISSION ID ---
    try {
        if (c.getAdmission() != null) {
            dto.setAdmissionId(c.getAdmission().getId());
        } else {
            dto.setAdmissionId(null);
        }
    } catch (Exception e) {
        log.error("❌ [DEBUG] Erreur lors du mapping de l'admission: {}", e.getMessage());
        dto.setAdmissionId(null);
    }

    return dto;
}
