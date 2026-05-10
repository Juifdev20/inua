# ✅ CODE JAVA COMPLET ET CORRIGÉ

## 1. Entité Consultation.java (Déjà corrigée)

L'entité a déjà la relation @ManyToMany correctement configurée :

```java
// ✅ NOUVEAU: Relation ManyToMany pour plusieurs services/examens par consultation
@ManyToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
@JoinTable(
    name = "consultation_services",
    joinColumns = @JoinColumn(name = "consultation_id"),
    inverseJoinColumns = @JoinColumn(name = "service_id")
)
@JsonIgnoreProperties({"consultations", "hibernateLazyInitializer", "handler"})
private Set<MedicalService> services = new HashSet<>();

// ✅ NOUVEAU: Montant total des examens prescrits (calculé par le médecin)
@Column(name = "exam_total_amount", precision = 19, scale = 2)
private BigDecimal examTotalAmount = BigDecimal.ZERO;
```

## 2. ConsultationServiceImpl.java (Méthode terminerConsultation)

```java
@Override
@Transactional
@PreAuthorize("hasAnyAuthority('ROLE_DOCTEUR', 'ROLE_ADMIN')")
public ConsultationDTO terminerConsultation(Long consultationId, String diagnostic, List<Long> examenIds) {
    log.info("🏁 [TERMINER] DÉBUT - Terminaison de la consultation ID: {}", consultationId);
    log.info("📋 [TERMINER] Examens reçus: {}", examenIds);
    log.info("📋 [TERMINER] Diagnostic reçu: {}", diagnostic);
    
    try {
        // 1. Vérifier l'existence de la consultation
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée avec l'ID: " + consultationId));
        
        log.info("✅ [TERMINER] Consultation trouvée: ID={}, Patient={}, Médecin={}", 
                consultation.getId(), 
                consultation.getPatient() != null ? consultation.getPatient().getFirstName() : "N/A",
                consultation.getDoctor() != null ? consultation.getDoctor().getFirstName() : "N/A");
        
        // 2. Charger les services et calculer le montant total
        BigDecimal montantTotal = BigDecimal.ZERO;
        Set<MedicalService> foundServices = new HashSet<>();
        
        if (examenIds != null && !examenIds.isEmpty()) {
            log.info("🔍 [TERMINER] Chargement de {} services", examenIds.size());
            
            // ✅ CHARGEMENT AUTOMATIQUE: Utiliser findAllById pour charger tous les services
            foundServices = new HashSet<>(serviceRepository.findAllById(examenIds));
            
            log.info("📦 [TERMINER] Services trouvés en base: {}", 
                    foundServices.stream()
                            .map(s -> s.getId() + ":" + s.getNom())
                            .collect(Collectors.toList()));
            
            // ✅ CALCUL AUTOMATIQUE: Sommer les prix de tous les services
            montantTotal = foundServices.stream()
                    .map(service -> service.getPrix() != null ? BigDecimal.valueOf(service.getPrix()) : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            log.info("💰 [TERMINER] Montant total calculé automatiquement: {}", montantTotal);
            log.info("🔗 [TERMINER] {} services trouvés", foundServices.size());
            
            // ✅ LIAISON AUTOMATIQUE: Lier les services à la consultation
            if (consultation.getServices() == null) {
                consultation.setServices(new HashSet<>());
                log.info("🆕 [TERMINER] Initialisation de la liste des services");
            }
            consultation.getServices().clear();
            consultation.getServices().addAll(foundServices);
            
            log.info("🔗 [TERMINER] Services liés à la consultation: {}", 
                    consultation.getServices().stream()
                            .map(s -> s.getId() + ":" + s.getNom())
                            .collect(Collectors.toList()));
            
            // Créer les examens prescrits pour compatibilité
            List<PrescribedExam> prescribedExams = foundServices.stream()
                    .map(service -> PrescribedExam.builder()
                            .consultation(consultation)
                            .service(service)
                            .serviceName(service.getNom())
                            .unitPrice(BigDecimal.valueOf(service.getPrix()))
                            .doctorNote("")
                            .status(PrescribedExamStatus.PRESCRIBED)
                            .build())
                    .collect(Collectors.toList());
            
            prescribedExamRepository.saveAll(prescribedExams);
            log.info("💾 [TERMINER] {} examens prescrits sauvegardés", prescribedExams.size());
            
            // Mettre à jour les examens dans la consultation (pour compatibilité)
            consultation.setExams(examenIds.stream()
                    .map(serviceId -> new ExamItem(serviceId, null))
                    .collect(Collectors.toList()));
        } else {
            log.info("ℹ️ [TERMINER] Aucun examen prescrit pour cette consultation");
        }
        
        // 3. Mettre à jour le diagnostic si fourni
        if (diagnostic != null && !diagnostic.trim().isEmpty()) {
            consultation.setDiagnosis(diagnostic);
            log.info("[DEBUG] Diagnostic sauvegarde dans consultation: {}", diagnostic);
        } else {
            log.warn("[DEBUG] Diagnostic est null ou vide !");
        }
        
        // 4. Sauvegarder le montant total des examens
        consultation.setExamTotalAmount(montantTotal);
        log.info("💰 [TERMINER] Montant total des examens sauvegardé: {}", montantTotal);
        
        // 5. Changer le statut en PENDING_PAYMENT pour qu'elle soit visible à la réception
        consultation.setStatus(ConsultationStatus.PENDING_PAYMENT);
        consultation.setStatut("PENDING_PAYMENT");
        consultation.setUpdatedAt(LocalDateTime.now());
        
        // 6. Sauvegarder la consultation avec les services liés automatiquement
        log.info("💾 [TERMINER] Sauvegarde de la consultation avec {} services", 
                consultation.getServices() != null ? consultation.getServices().size() : 0);
        
        Consultation savedConsultation = consultationRepository.save(consultation);
        
        log.info("✅ [TERMINER] Consultation {} terminée avec succès - Montant total: {} - Services: {}", 
                consultationId, montantTotal, 
                savedConsultation.getServices() != null ? savedConsultation.getServices().size() : 0);
        
        log.info("[DEBUG] Diagnostic après sauvegarde: {}", savedConsultation.getDiagnosis());
        
        return mapToDTO(savedConsultation);
        
    } catch (Exception e) {
        log.error("❌ [TERMINER] Erreur lors de la terminaison de la consultation {}: {}", consultationId, e.getMessage(), e);
        throw new RuntimeException("Erreur lors de la terminaison de la consultation: " + e.getMessage());
    }
}
```

## 3. Vérification du mapping dans mapToDTO()

Assurez-vous que la méthode mapToDTO() inclut bien :

```java
// --- SERVICES ---
if (c.getServices() != null && !c.getServices().isEmpty()) {
    List<MedicalServiceDTO> serviceDTOs = c.getServices().stream()
            .map(service -> MedicalServiceDTO.builder()
                    .id(service.getId())
                    .nom(service.getNom())
                    .description(service.getDescription())
                    .prix(service.getPrix())
                    .departement(service.getDepartement())
                    .duree(service.getDuree())
                    .isActive(service.getIsActive())
                    .build())
            .collect(Collectors.toList());
    dto.setServices(serviceDTOs);
    log.info("🔗 [DEBUG] mapToDTO - {} services mappés", serviceDTOs.size());
} else {
    dto.setServices(List.of());
    log.debug("🔗 [DEBUG] mapToDTO - Aucun service à mapper");
}
```

## 4. DTO et Controller (Déjà configurés)

Le ConsultationDTO et ReceptionController sont déjà correctement configurés pour inclure les services et les montants.

## 🎯 Résultat Final

Avec ce code :
- ✅ **Chargement automatique** des services via `findAllById()`
- ✅ **Calcul automatique** du montant total 
- ✅ **Liaison automatique** via `@ManyToMany` avec `CascadeType.ALL`
- ✅ **Persistance automatique** dans `consultation_services`
- ✅ **Mapping complet** dans le DTO pour le frontend

Le backend va maintenant gérer automatiquement toute la table `consultation_services` !
