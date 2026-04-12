package com.hospital.backend.dto;

import com.hospital.backend.entity.DocumentType;
import com.hospital.backend.entity.PatientDocument;
import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO pour la transmission des documents patients au frontend
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientDocumentDTO {

    private Long id;
    private String fileName;
    private String filePath;
    private String fileUrl;
    private DocumentType documentType;
    private LocalDateTime createdAt;
    private Long consultationId;
    private Long patientId;
    private String patientName;
    private Double totalAmount;
    private Double amountPaid;
    private Double remainingCredit;
    private String paymentStatus; // "SOLDE" ou "CREDIT"
    
    // ✅ NOUVEAU: Contenu du document en Base64 (pour affichage inline)
    private String contentBase64;
    
    // ✅ NOUVEAU: Taille et type MIME
    private Long fileSize;
    private String mimeType;
    
    // ✅ Indicateur si le contenu est disponible en base de données
    private Boolean hasContent;

    /**
     * Méthode utilitaire pour créer un DTO depuis l'entité
     */
    public static PatientDocumentDTO fromEntity(PatientDocument document) {
        if (document == null) return null;

        // Déterminer le statut de paiement
        String paymentStatus = "SOLDE";
        if (document.getRemainingCredit() != null && document.getRemainingCredit() > 0) {
            paymentStatus = "CREDIT";
        }

        // ✅ Convertir le contenu binaire en Base64 si présent
        String contentBase64 = null;
        Boolean hasContent = false;
        if (document.getContent() != null && document.getContent().length > 0) {
            contentBase64 = java.util.Base64.getEncoder().encodeToString(document.getContent());
            hasContent = true;
        }

        return PatientDocumentDTO.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .filePath(document.getFilePath())
                .fileUrl(document.getFileUrl())
                .documentType(document.getDocumentType())
                .createdAt(document.getCreatedAt())
                .consultationId(document.getConsultation() != null ? document.getConsultation().getId() : null)
                .patientId(document.getPatientId())
                .patientName(document.getPatientName())
                .totalAmount(document.getTotalAmount())
                .amountPaid(document.getAmountPaid())
                .remainingCredit(document.getRemainingCredit())
                .paymentStatus(paymentStatus)
                .contentBase64(contentBase64)
                .fileSize(document.getFileSize())
                .mimeType(document.getMimeType())
                .hasContent(hasContent)
                .build();
    }
}

