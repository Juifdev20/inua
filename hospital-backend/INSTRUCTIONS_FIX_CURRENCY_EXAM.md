# Instructions pour corriger la devise des examens

## Problème
Les examens prescrits perdent leur devise (USD/CDF) lors du passage du médecin vers la caisse.

## Solution appliquée

### ✅ Déjà fait automatiquement:
1. `PrescribedExam.java` - Ajout champ `currency`
2. `AllLabPaymentDTO.java` - Ajout champ `currency` dans PrescribedExamDTO
3. `PendingPaymentDTO.java` - Ajout champ `currency` dans PrescribedExamDTO
4. `FinanceController.java` - Mapping de la devise vers le DTO
5. `ConsultationServiceImpl.java` - Mapping de la devise vers PendingPaymentDTO

### 🔧 À faire manuellement:

#### 1. Modifier `MedicalService.java`

Ajouter le champ `currency` après le champ `prix`:

```java
@Column(nullable = false)
private Double prix;

// ✅ Devise du service (CDF ou USD)
@Enumerated(EnumType.STRING)
@Column(name = "currency")
private Currency currency;

private Integer duree; // en minutes (ex: 30, 45)
```

Et vérifier l'import:
```java
import com.hospital.backend.entity.Currency;
```

#### 2. Modifier `ConsultationServiceImpl.java` - 3 endroits

**Endroit 1 (ligne ~1001):**
```java
PrescribedExam prescribedExam = PrescribedExam.builder()
        .consultation(consultation)
        .service(service)
        .serviceName(service.getNom())
        .unitPrice(unitPrice)
        .quantity(1)
        .totalPrice(unitPrice)
        .doctorNote(doctorNote)
        .active(true)
        .status(PrescribedExamStatus.PRESCRIBED)
        .currency(service.getCurrency())  // ✅ AJOUTER CETTE LIGNE
        .build();
```

**Endroit 2 (ligne ~1359):**
```java
return PrescribedExam.builder()
        .consultation(consultation)
        .service(service)
        .serviceName(service.getNom())
        .unitPrice(unitPrice)
        .quantity(1)
        .totalPrice(unitPrice)
        .doctorNote(doctorNote)
        .active(true)
        .status(PrescribedExamStatus.PRESCRIBED)
        .currency(service.getCurrency())  // ✅ AJOUTER CETTE LIGNE
        .build();
```

**Endroit 3 (ligne ~1518):**
```java
PrescribedExam prescribedExam = PrescribedExam.builder()
        .consultation(consultation)
        .service(service)
        .serviceName(service.getNom())
        .unitPrice(unitPrice)
        .quantity(1)
        .totalPrice(unitPrice)
        .doctorNote(examDto.getNote())
        .active(true)
        .status(PrescribedExamStatus.PRESCRIBED)
        .createdAt(LocalDateTime.now())
        .currency(service.getCurrency())  // ✅ AJOUTER CETTE LIGNE
        .build();
```

### 🗃️ Scripts SQL à exécuter

```sql
-- Ajouter la colonne currency à medical_services
ALTER TABLE medical_services 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- Mettre à jour les services existants avec CDF par défaut
UPDATE medical_services 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- Ajouter la colonne currency à prescribed_exams
ALTER TABLE prescribed_exams 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- Mettre à jour les examens existants avec CDF par défaut
UPDATE prescribed_exams 
SET currency = 'CDF' 
WHERE currency IS NULL;
```

### 🔧 Frontend (optionnel)

Si l'interface caisse doit afficher la devise, utiliser le champ `currency` dans le DTO:
```javascript
// Exemple: Afficher le prix avec sa devise
`${exam.unitPrice} ${exam.currency || 'CDF'}`
```

## Résumé

Après ces modifications:
1. Les services peuvent être enregistrés en USD ou CDF
2. Quand le médecin prescrit, la devise est copiée dans l'examen
3. La caisse reçoit l'examen avec la bonne devise (USD ou CDF)
4. Le paiement se fait dans la devise d'origine

**Redémarrez le backend après toutes les modifications!**
