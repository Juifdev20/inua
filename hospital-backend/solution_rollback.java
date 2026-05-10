// ✅ SOLUTION: Ajouter des logs détaillés pour identifier l'erreur exacte

// Dans DoctorApiController.getConsultations(), remplacer le forEach actuel par:

try {
    consultations.forEach(c -> {
        try {
            ConsultationDTO dto = consultationService.mapToDTO(c);
            log.info("✅ Consultation {} mappée avec succès", c.getId());
            consultationDTOs.add(dto);
        } catch (Exception e) {
            log.error("❌ Erreur lors du mapping de la consultation {}: {}", c.getId(), e.getMessage());
            e.printStackTrace();
            // Ajouter un DTO par défaut pour éviter de casser tout le processus
            ConsultationDTO defaultDto = ConsultationDTO.builder()
                    .id(c.getId())
                    .consultationCode(c.getConsultationCode())
                    .patientName("ERREUR MAPPING")
                    .status(c.getStatus())
                    .build();
            consultationDTOs.add(defaultDto);
        }
    });
} catch (Exception e) {
    log.error("❌ Erreur globale lors du traitement des consultations: {}", e.getMessage());
    e.printStackTrace();
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("success", false, "error", "Erreur lors de la récupération des consultations: " + e.getMessage()));
}

// ✅ SOLUTION: Alternative avec @Transactional(readOnly = true)

// Ou changer l'annotation de la méthode:
@Transactional(readOnly = true)  // Évite les rollback en cas d'erreur
public ResponseEntity<List<ConsultationDTO>> getConsultations(Authentication authentication) {
