package com.hospital.backend.controller;

import com.hospital.backend.dto.AiChatRequest;
import com.hospital.backend.dto.AiChatResponse;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.User;
import com.hospital.backend.service.AiPromptService;
import com.hospital.backend.service.GeminiAiService;
import com.hospital.backend.service.PatientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiChatController {

    private final AiPromptService aiPromptService;
    private final GeminiAiService geminiAiService;
    private final PatientService patientService;

    @PostMapping("/chat")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<AiChatResponse> chat(
            @RequestBody AiChatRequest request,
            Authentication authentication) {

        try {
            // Récupérer le patient connecté
            String username = authentication.getName();
            Patient patient = patientService.getPatientByUsername(username);

            if (patient == null) {
                log.error("Patient non trouvé pour l'utilisateur: {}", username);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            // Vérification : le patient ne peut chatter que pour lui-même
            if (!patient.getId().equals(request.getPatientId())) {
                log.warn("Tentative d'accès aux données d'un autre patient par: {}", username);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // Construire le prompt complet avec le contexte du patient
            String fullPrompt = aiPromptService.buildSystemPrompt(patient, request.getPatientName()) + "\n\n" + request.getMessage();

            // Appeler l'API Gemini
            String response = geminiAiService.callGemini(fullPrompt);

            log.info("Chat IA généré avec succès pour le patient: {}", patient.getId());
            return ResponseEntity.ok(new AiChatResponse(response));

        } catch (Exception e) {
            log.error("Erreur lors du traitement du chat IA", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AiChatResponse("Je suis désolé, une erreur s'est produite. Veuillez réessayer plus tard."));
        }
    }
}
