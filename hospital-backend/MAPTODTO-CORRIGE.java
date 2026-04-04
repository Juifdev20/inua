// MÉTHODE mapToDTO CORRIGÉE - Remplacer la méthode existante entièrement
// Copiez ce code et remplacez toute la méthode mapToDTO dans ConsultationServiceImpl.java

@Override
public ConsultationDTO mapToDTO(Consultation c) {
    if (c == null) return null;
    
    ConsultationDTO dto = ConsultationDTO.builder()
            .id(c.getId())
            .consultationCode(c.getConsultationCode())
            .patientId(c.getPatient() != null ? c.getPatient().getId() : null)
            .status(c.getStatus())
            .statut(c.getStatut())
            .decisionNote(c.getDecisionNote())
            .proposedNewDate(c.getProposedNewDate())
            .consultationDate(c.getConsultationDate())
            .reasonForVisit(c.getReasonForVisit())
            // --- LOGIQUE MOTIF : Priorité admission, fallback consultation, défaut ---
            .motif(getMotif(c))
            .diagnosis(c.getDiagnosis())
            .treatment(c.getTreatment())
            // --- PARAMÈTRES VITAUX : Priorité à l'admission, fallback sur consultation ---
            .poids(getVitalSign(c, "poids"))
            .temperature(getVitalSign(c, "temperature"))
            .taille(getVitalSign(c, "taille"))
            .tensionArterielle(getVitalSign(c, "tensionArterielle"))
            .fraisFiche(c.getFraisFiche())
            // --- SERVICE ---
            .serviceId(c.getService() != null ? c.getService().getId() : null)
            .serviceName(c.getService() != null ? c.getService().getNom() : null)
            .servicePrice(c.getService() != null ? c.getService().getPrix() : null)
            // --- FINANCES ---
            .ficheAmountDue(c.getFicheAmountDue())
            .ficheAmountPaid(c.getFicheAmountPaid())
            .consulAmountDue(c.getConsulAmountDue())
            .consulAmountPaid(c.getConsulAmountPaid())
            .createdAt(c.getCreatedAt())
            .updatedAt(c.getUpdatedAt())
            // --- EXAMENS ---
            .exams(c.getExams() != null ? c.getExams().stream()
                .map(e -> new com.hospital.backend.dto.ExamItemDTO(e.getServiceId(), e.getNote()))
                .collect(Collectors.toList()) : null)
            .examAmountPaid(c.getExamAmountPaid())
            // --- ADMISSION ---
            .admissionId(c.getAdmission() != null ? c.getAdmission().getId() : null)
            .build();

    // --- DEBUG DIAGNOSTIC ---
    if (c.getDiagnosis() != null) {
        log.info("[DEBUG] mapToDTO - Diagnostic trouve: {}", c.getDiagnosis());
    } else {
        log.warn("[DEBUG] mapToDTO - Diagnostic est NULL !");
    }

    // --- INFOS PATIENT ---
    if (c.getPatient() != null) {
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
        
        // Photo du patient avec logique de nettoyage demandée
        if (p.getPhotoUrl() != null && !p.getPhotoUrl().isEmpty()) {
            String patientPhotoUrl = normalizePhotoUrl(p.getPhotoUrl());
            dto.setPatientPhoto(patientPhotoUrl);
            log.info("[DEBUG] Photo du patient normalisee: {} -> {}", 
                    p.getPhotoUrl(), patientPhotoUrl);
        } else {
            dto.setPatientPhoto("/uploads/default-patient.png");
            log.info("[DEBUG] Photo par defaut du patient: /uploads/default-patient.png");
        }
    }

    // --- INFOS MÉDECIN ---
    if (c.getDoctor() != null) {
        dto.setDoctorId(c.getDoctor().getId());
        dto.setDoctorName(c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName());
        // Ajout de la photo du docteur avec correction du chemin
        if (c.getDoctor().getPhotoUrl() != null && !c.getDoctor().getPhotoUrl().isEmpty()) {
            String photoUrl = c.getDoctor().getPhotoUrl();
            
            // Corriger TOUS les cas de doubles slashes et chemins incorrects
            if (photoUrl.contains("/uploads//uploads/")) {
                photoUrl = photoUrl.replace("/uploads//uploads/", "/uploads/");
            } else if (photoUrl.contains("/profiles//uploads/")) {
                photoUrl = photoUrl.replace("/profiles//uploads/", "/uploads/");
            } else if (photoUrl.contains("/uploads/profiles//uploads/")) {
                photoUrl = photoUrl.replace("/uploads/profiles//uploads/", "/uploads/");
            } else if (photoUrl.contains("profiles//uploads/")) {
                photoUrl = photoUrl.replace("profiles//uploads/", "/uploads/");
            } else if (photoUrl.startsWith("/uploads/")) {
                // URL déjà correcte
            } else if (photoUrl.startsWith("uploads/")) {
                photoUrl = "/" + photoUrl;
            } else if (photoUrl.startsWith("/profiles/")) {
                photoUrl = photoUrl.replace("/profiles/", "/uploads/");
            } else if (photoUrl.startsWith("profiles/")) {
                photoUrl = "/uploads/" + photoUrl.substring(9);
            } else {
                photoUrl = "/uploads/" + photoUrl;
            }
            
            dto.setDoctorPhoto(photoUrl);
        }
        if (c.getDoctor().getDepartment() != null) {
            dto.setDepartmentName(c.getDoctor().getDepartment().getNom());
        }
    }
    
    return dto;
}
