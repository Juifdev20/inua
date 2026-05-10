# 🚀 CORRECTION BACKEND - Erreurs 403 et 500

## Erreurs à corriger:

### 1. Erreur 403 (Forbidden) sur /api/v1/consultations/{id}

Le médecin ne peut pas accéder aux détails d'une consultation. Cela signifie que l'endpoint n'est pas autorisé pour ROLE_DOCTEUR.

**Dans SecurityConfig.java, ajouter:**

```java
// Allow doctors to access consultation details
.requestMatchers(HttpMethod.GET, "/api/v1/consultations/**", "/api/consultations/**")
.hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_RECEPTION", "ROLE_PATIENT")
```

### 2. Erreur 500 sur /api/v1/doctor/consultations

Causée par une NullPointerException dans le mapping des consultations.

**Dans ConsultationServiceImpl.java - Méthode mapToDTO:**

Ajouter des vérifications null pour patient et admission:

```java
private ConsultationDTO mapToDTO(Consultation c) {
    if (c == null) return null;
    
    ConsultationDTO dto = ConsultationDTO.builder()
        .id(c.getId())
        // ... autres champs
        .build();
    
    // Vérification null pour patient
    if (c.getPatient() != null) {
        Patient p = c.getPatient();
        dto.setPatientName(p.getFirstName() + " " + p.getLastName());
        // ... autres champs patient
    } else {
        dto.setPatientName("Patient Inconnu");
    }
    
    // Vérification null pour doctor
    if (c.getDoctor() != null) {
        dto.setDoctorName(c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName());
    }
    
    return dto;
}
```

---

## Checklist

- [ ] Ouvrir IntelliJ et démarrer le backend
- [ ] Reproduire l'erreur en accédant à /doctor/consultations
- [ ] Lire les logs de l'erreur 500
- [ ] Appliquer les corrections ci-dessus
- [ ] Redémarrer le backend
- [ ] Tester à nouveau

