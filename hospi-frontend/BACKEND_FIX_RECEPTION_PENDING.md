# 🚀 CORRECTIONS BACKEND - Affichage des Consultations à la Réception

## Contexte
Le frontend a été mis à jour pour afficher les consultations en attente de paiement à la réception. Le backend doit être corrigé pour s'adapter.

---

## ✅ Modifications à Appliquer dans IntelliJ

### 1. Consultation.java (Entity)
**Fichier:** `src/main/java/com/hospital/backend/entity/Consultation.java`

Ajouter le champ `examTotalAmount` après `examAmountPaid`:

```java
@Column(name = "exam_amount_paid", precision = 19, scale = 2)
private BigDecimal examAmountPaid = BigDecimal.ZERO;

// ✅ NOUVEAU: Montant total des examens prescrits (calculé par le médecin)
@Column(name = "exam_total_amount", precision = 19, scale = 2)
private BigDecimal examTotalAmount = BigDecimal.ZERO;
```

---

### 2. ConsultationDTO.java
**Fichier:** `src/main/java/com/hospital/backend/dto/ConsultationDTO.java`

Ajouter le champ `examTotalAmount` dans la section "NOUVEAUX CHAMPS":

```java
// --- NOUVEAUX CHAMPS ---
private List<ExamItemDTO> exams;
private BigDecimal examAmountPaid;
private BigDecimal examTotalAmount;  // ✅ NOUVEAU: Montant total des examens
private Long admissionId;
```

---

### 3. ReceptionPaymentDTO.java
**Fichier:** `src/main/java/com/hospital/backend/dto/ReceptionPaymentDTO.java`

Ajouter les champs pour le montant:

```java
import java.math.BigDecimal;

// Dans la classe principale:
private List<ExamItemDTO> exams;

// ✅ NOUVEAU: Champs pour le montant
private BigDecimal totalAmount;      // Montant total à payer
private BigDecimal examAmountPaid;   // Montant déjà payé
```

---

### 4. ConsultationServiceImpl.java
**Fichier:** `src/main/java/com/hospital/backend/service/impl/ConsultationServiceImpl.java`

**A. Dans la méthode `mapToDTO`** (chercher ".ficheAmountPaid"), ajouter:

```java
.ficheAmountPaid(c.getFicheAmountPaid())
.examTotalAmount(c.getExamTotalAmount())  // ✅ NOUVEAU
.consulAmountDue(c.getConsulAmountDue())
```

**B. Dans la méthode `terminerConsultation`** (chercher "// 5. Changer le statut"), remplacer par:

```java
// 5. Sauvegarder le montant total des examens
consultation.setExamTotalAmount(montantTotal);
log.info("💰 [TERMINER] Montant total des examens sauvegardé: {}", montantTotal);

// 6. Changer le statut en PENDING_PAYMENT pour qu'elle soit visible à la réception
consultation.setStatus(ConsultationStatus.PENDING_PAYMENT);
consultation.setStatut("PENDING_PAYMENT");
```

---

### 5. ReceptionController.java
**Fichier:** `src/main/java/com/hospital/backend/controller/ReceptionController.java**

**AVANT la méthode `getConsultationsByStatus`**, ajouter ce nouveau endpoint:

```java
// ✅ NOUVEAU: Endpoint pour récupérer les consultations en attente de paiement (PENDING_PAYMENT)
@GetMapping("/consultations/pending")
public ResponseEntity<?> getPendingConsultations() {
    log.info("🔍 [RECEPTION] Récupération des consultations en attente de paiement (PENDING_PAYMENT)");
    
    try {
        // Récupérer les PendingPaymentDTO depuis le service
        List<com.hospital.backend.dto.PendingPaymentDTO> pendingDTOs = consultationService.getPendingPayments();
        
        // Mapper vers ReceptionPaymentDTO en incluant le montant total
        List<ReceptionPaymentDTO> consultations = pendingDTOs.stream()
            .map(pending -> ReceptionPaymentDTO.builder()
                .id(pending.getConsultationId())
                .patientId(pending.getPatientId())
                .patientName(pending.getPatientName())
                .patientPhoto(pending.getPatientPhoto())
                .doctorId(pending.getDoctorId())
                .doctorName(pending.getDoctorName())
                .motif("Consultation terminée")
                .status(pending.getStatus())
                .createdAt(pending.getCreatedAt())
                .exams(pending.getPrescribedExams().stream()
                    .map(exam -> ReceptionPaymentDTO.ExamItemDTO.builder()
                        .serviceId(exam.getServiceId())
                        .note(exam.getDoctorNote())
                        .build())
                    .collect(java.util.stream.Collectors.toList()))
                .totalAmount(pending.getTotalAmount())       // ✅ Montant total
                .examAmountPaid(pending.getAmountPaid())      // ✅ Montant payé
                .build())
            .collect(java.util.stream.Collectors.toList());
        
        log.info("✅ [RECEPTION] {} consultations en attente trouvées", consultations.size());
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "content", consultations,
            "count", consultations.size()
        ));
        
    } catch (Exception e) {
        log.error("❌ [RECEPTION] Erreur lors de la récupération des consultations en attente: {}", e.getMessage(), e);
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "error", e.getMessage()
        ));
    }
}
```

---

## 🔧 Actions Après Modification

1. **Redémarrer le Backend** dans IntelliJ
2. **Vérifier la console** pour les logs de connexion
3. **Tester le flux:**
   - Se connecter en tant que médecin
   - Terminer une consultation avec des examens
   - Se connecter en tant que réceptionniste
   - Cliquer sur "Actualiser" dans ExamReception
   - Vérifier que le patient apparaît avec le montant total

---

## 📋 Checklist

- [ ] Consultation.java - Ajout examTotalAmount
- [ ] ConsultationDTO.java - Ajout examTotalAmount
- [ ] ReceptionPaymentDTO.java - Ajout totalAmount et examAmountPaid
- [ ] ConsultationServiceImpl.java - Sauvegarde examTotalAmount dans terminerConsultation
- [ ] ConsultationServiceImpl.java - Mapping examTotalAmount dans mapToDTO
- [ ] ReceptionController.java - Ajout endpoint /consultations/pending
- [ ] Redémarrer le backend
- [ ] Tester le flux médecin → réception

---

## 📝 Note Importante

La base de données doit être mise à jour avec la nouvelle colonne. Selon votre configuration:

- **Hibernate (auto-update):** Redémarrer suffit
- **Migration manuelle:** Exécuter:
  ```sql
  ALTER TABLE consultations ADD COLUMN exam_total_amount DECIMAL(19,2) DEFAULT 0;
  ```

