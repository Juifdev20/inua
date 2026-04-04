# 🚀 PROMPT COMPLET POUR CORRECTION BACKEND - Consultations

## Contexte
Le frontend a été mis à jour pour afficher les consultations avec les nouvelles propriétés. Le backend doit maintenant envoyer les données dans le bon format.

---

## ✅ DONNÉES REQUISES POUR CHAQUE CONSULTATION

Le frontend attend un objet `Consultation` avec les clés suivantes :

| Clé | Type | Description | Exemple |
|-----|------|-------------|---------|
| `patientName` | String | Nom complet du patient | "DIEUDONNE JEAN" |
| `motif` | String | Raison de la visite | "Fièvre et maux de tête" |
| `createdAt` | DateTime | Date de création | "2026-03-08T10:30:00" |
| `patientPhoto` | String (URL) | URL de la photo du patient | "/uploads/photo.jpg" |

---

## 📡 ENDPOINT À CORRIGER

### GET /api/v1/doctor/consultations

**Réponse actuelle (PROBLÉMATIQUE) :**
```json
{
  "id": 38,
  "patient": { ... },
  "reason_for_visit": "Consultation générale",
  "created_at": "2026-03-08T10:30:00",
  // ❌ MANQUE: patientName, motif, patientPhoto au niveau racine
}
```

**Réponse attendue (APRÈS CORRECTION) :**
```json
{
  "id": 38,
  "patientName": "DIEUDONNE JEAN",
  "motif": "Fièvre et maux de tête",
  "createdAt": "2026-03-08T10:30:00",
  "patientPhoto": "/uploads/patients/photo_123.jpg",
  "patient": { ... },
  "status": "en_cours"
}
```

---

## 🔧 CORRECTIONS À IMPLEMENTER

### 1. Mapper les propriétés au niveau racine de la consultation

Dans votre `ConsultationController` ou `ConsultationService`, faites ce mapping :

```java
// Exemple en Java/Spring
public ConsultationDTO toDTO(Consultation consultation) {
    return ConsultationDTO.builder()
        .id(consultation.getId())
        .patientName(consultation.getPatient().getFirstName() + " " + 
                     consultation.getPatient().getLastName())
        .motif(consultation.getReasonForVisit())
        .createdAt(consultation.getCreatedAt())
        .patientPhoto(consultation.getPatient().getPhotoUrl())
        .patient(consultation.getPatient())
        .status(consultation.getStatus())
        .build();
}
```

### 2. Configurer CORS pour le frontend

确保 Spring Boot 允许来自前端的请求：

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173", "http://localhost:3000")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

### 3. Autoriser l'accès aux images

Dans `SecurityConfig.java` :

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/uploads/**").permitAll()
            .requestMatchers("/api/v1/auth/**").permitAll()
            .anyRequest().authenticated()
        );
    return http.build();
}
```

---

## 🧪 TESTS À EFFECTUER

Après les corrections, lancez ces tests :

```bash
# Test 1 : Récupérer les consultations
curl -X GET http://localhost:8080/api/v1/doctor/consultations \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Vérifiez que la réponse contient :
# - patientName
# - motif
# - createdAt
# - patientPhoto
```

---

## 📋 CHECKLIST FINAL

- [ ] L'endpoint `/api/v1/doctor/consultations` retourne `patientName`
- [ ] L'endpoint `/api/v1/doctor/consultations` retourne `motif`
- [ ] L'endpoint `/api/v1/doctor/consultations` retourne `createdAt`
- [ ] L'endpoint `/api/v1/doctor/consultations` retourne `patientPhoto`
- [ ] Les photos sont accessibles (pas d'erreur 403)
- [ ] Les dates sont au format ISO (2026-03-08T10:30:00)

---

## 💡 NOTES

1. **Format de date** : Utilisez `toISOString()` ou `@JsonFormat` pour les dates
2. **URLs d'images** : Utilisez des chemins relatifs (`/uploads/...`) sans doubles slashes
3. **Fallbacks** : Le frontend gère les valeurs nulles avec des messages par défaut

