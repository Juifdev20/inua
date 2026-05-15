package com.hospital.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiAiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    // URL mise à jour avec le modèle gemini-2.5-flash (actif sur ta clé)
    private final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=";

    private final RestTemplate restTemplate;

    public GeminiAiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String callGemini(String prompt) {
        String url = GEMINI_API_URL + apiKey;

        // Préparation du corps de la requête (Format Google AI)
        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> content = new HashMap<>();
        Map<String, String> part = new HashMap<>();
        
        part.put("text", prompt);
        content.put("parts", List.of(part));
        requestBody.put("contents", List.of(content));

        try {
            // Appel à l'API
            Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);

            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                Map<String, Object> firstCandidate = candidates.get(0);
                Map<String, Object> contentRes = (Map<String, Object>) firstCandidate.get("content");
                List<Map<String, String>> parts = (List<Map<String, String>>) contentRes.get("parts");
                
                return parts.get(0).get("text");
            }
            return "Désolé, je ne peux pas répondre pour le moment.";

        } catch (HttpClientErrorException e) {
            // Log détaillé en cas d'erreur API (très utile pour débugger)
            System.err.println("❌ Erreur API Gemini: " + e.getResponseBodyAsString());
            return "Erreur lors de la communication avec l'IA.";
        } catch (Exception e) {
            System.err.println("❌ Erreur technique: " + e.getMessage());
            return "Une erreur interne est survenue.";
        }
    }
}
