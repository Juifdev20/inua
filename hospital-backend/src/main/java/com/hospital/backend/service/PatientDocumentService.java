 package com.hospital.backend.service;

import com.hospital.backend.dto.PatientDocumentDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service de gestion des documents patients et génération de PDFs
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PatientDocumentService {

    private final PatientDocumentRepository patientDocumentRepository;
    private final ConsultationRepository consultationRepository;

    // Configuration du chemin de stockage des PDFs
    @Value("${app.document.storage.path:./documents}")
    private String documentStoragePath;

    // Configuration de l'URL publique pour accéder aux PDFs
    @Value("${app.document.public.url:http://localhost:8080/api/v1/documents}")
    private String documentPublicUrl;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    /**
     * Génère automatiquement un dossier patient PDF quando la consultation est terminée
     * @param consultationId ID de la consultation terminée
     * @return PatientDocumentDTO Le document créé
     */
    @Transactional
    public PatientDocumentDTO generatePatientDossier(Long consultationId) {
        log.info("🎯 [PATIENT_DOCUMENT] Début de la génération du dossier patient pour consultation ID: {}", consultationId);

        try {
            // Récupérer la consultation avec toutes ses relations
            Consultation consultation = consultationRepository.findById(consultationId)
                    .orElseThrow(() -> new RuntimeException("Consultation non trouvée: " + consultationId));

            // Vérifier si un document existe déjà pour cette consultation
            if (patientDocumentRepository.existsByConsultationId(consultationId)) {
                log.warn("⚠️ [PATIENT_DOCUMENT] Un document existe déjà pour cette consultation: {}", consultationId);
                return patientDocumentRepository.findByConsultationId(consultationId)
                        .map(PatientDocumentDTO::fromEntity)
                        .orElse(null);
            }

            // Récupérer les données nécessaires
            Patient patient = consultation.getPatient();
            String patientName = patient.getFirstName() + " " + patient.getLastName();
            String dateStr = LocalDateTime.now().format(DATE_FORMATTER);

            // Générer le nom du fichier unique
            String fileName = generateUniqueFileName(consultation, patient, dateStr);

            // Créer le répertoire de stockage si nécessaire
            File storageDir = new File(documentStoragePath);
            if (!storageDir.exists()) {
                storageDir.mkdirs();
            }

            // Générer le PDF
            String filePath = documentStoragePath + File.separator + fileName;
            generatePDF(consultation, patient, filePath);

            // Calculer les informations financières
            Double totalAmount = calculateTotalAmount(consultation);
            Double amountPaid = calculateAmountPaid(consultation);
            Double remainingCredit = totalAmount - amountPaid;
            if (remainingCredit < 0) remainingCredit = 0.0;

            // Créer l'enregistrement du document
            PatientDocument document = PatientDocument.builder()
                    .fileName(fileName)
                    .filePath(filePath)
                    .fileUrl(documentPublicUrl + "/" + fileName)
                    .documentType(DocumentType.DOSSIER_PATIENT)
                    .consultation(consultation)
                    .patientId(patient.getId())
                    .patientName(patientName)
                    .totalAmount(totalAmount)
                    .amountPaid(amountPaid)
                    .remainingCredit(remainingCredit)
                    .build();

            document = patientDocumentRepository.save(document);

            log.info("✅ [PATIENT_DOCUMENT] Dossier patient généré avec succès: {}", fileName);

            return PatientDocumentDTO.fromEntity(document);

        } catch (Exception e) {
            log.error("❌ [PATIENT_DOCUMENT] Erreur lors de la génération du dossier: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la génération du dossier patient: " + e.getMessage(), e);
        }
    }

    /**
     * Génère un nom de fichier unique
     */
    private String generateUniqueFileName(Consultation consultation, Patient patient, String dateStr) {
        String patientFirstName = patient.getFirstName().replaceAll("\\s+", "_");
        String patientLastName = patient.getLastName().replaceAll("\\s+", "_");
        String consultationCode = consultation.getConsultationCode() != null 
                ? consultation.getConsultationCode() 
                : consultation.getId().toString();
        
        return String.format("Dossier_%s_%s_%s_%s.pdf", 
                patientLastName, 
                patientFirstName, 
                consultationCode,
                dateStr.replace("-", ""));
    }

    /**
     * Calcule le montant total à payer
     */
    private Double calculateTotalAmount(Consultation consultation) {
        double total = 0.0;
        
        // Fiche de consultation
        if (consultation.getFicheAmountDue() != null) {
            total += consultation.getFicheAmountDue();
        }
        
        // Examens prescrits
        if (consultation.getExamTotalAmount() != null) {
            total += consultation.getExamTotalAmount().doubleValue();
        }
        
        // Consultation
        if (consultation.getConsulAmountDue() != null) {
            total += consultation.getConsulAmountDue();
        }
        
        return total;
    }

    /**
     * Calcule le montant déjà payé
     */
    private Double calculateAmountPaid(Consultation consultation) {
        double paid = 0.0;
        
        // Fiche payée
        if (consultation.getFicheAmountPaid() != null) {
            paid += consultation.getFicheAmountPaid();
        }
        
        // Examens payés
        if (consultation.getExamAmountPaid() != null) {
            paid += consultation.getExamAmountPaid().doubleValue();
        }
        
        // Consultation payée
        if (consultation.getConsulAmountPaid() != null) {
            paid += consultation.getConsulAmountPaid();
        }
        
        return paid;
    }

    /**
     * Génère le PDF du dossier patient
     */
    private void generatePDF(Consultation consultation, Patient patient, String filePath) throws Exception {
        log.info("📄 [PATIENT_DOCUMENT] Génération du PDF: {}", filePath);

        // Utilisation d'OpenPDF pour générer le PDF
        com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4);
        com.lowagie.text.pdf.PdfWriter.getInstance(document, new FileOutputStream(filePath));
        
        document.open();

        // Polices
        com.lowagie.text.Font titleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 18, com.lowagie.text.Font.BOLD);
        com.lowagie.text.Font headerFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 14, com.lowagie.text.Font.BOLD);
        com.lowagie.text.Font normalFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 11, com.lowagie.text.Font.NORMAL);
        com.lowagie.text.Font boldFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 11, com.lowagie.text.Font.BOLD);

        // Titre
        com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph("DOSSIER MÉDICAL DU PATIENT", titleFont);
        title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        title.setSpacingAfter(10);
        document.add(title);

        // Informations patient
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));
        String patientInfo = String.format("Patient: %s %s | Code: %s | Date: %s",
                patient.getFirstName(), 
                patient.getLastName(),
                patient.getPatientCode(),
                LocalDateTime.now().format(DATE_FORMATTER));
        document.add(new com.lowagie.text.Paragraph(patientInfo, normalFont));
        
        String consultationInfo = String.format("N° Consultation: %s | Date: %s",
                consultation.getConsultationCode() != null ? consultation.getConsultationCode() : consultation.getId().toString(),
                consultation.getConsultationDate() != null ? consultation.getConsultationDate().format(DATE_FORMATTER) : "N/A");
        document.add(new com.lowagie.text.Paragraph(consultationInfo, normalFont));
        
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));

        // === SECTION TRIAGE (CONSTANTES VITALES) ===
        addSectionHeader(document, "I. CONSTANTES VITALES (TRIAGE)", headerFont);
        
        String[] triageData = {
            "Poids: " + (consultation.getPoids() != null ? consultation.getPoids() + " kg" : "Non enregistré"),
            "Taille: " + (consultation.getTaille() != null ? consultation.getTaille() + " cm" : "Non enregistré"),
            "Température: " + (consultation.getTemperature() != null ? consultation.getTemperature() + " °C" : "Non enregistré"),
            "Tension Artérielle: " + (consultation.getTensionArterielle() != null ? consultation.getTensionArterielle() + " mmHg" : "Non enregistré")
        };
        
        for (String data : triageData) {
            document.add(new com.lowagie.text.Paragraph(data, normalFont));
        }
        
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));

        // === SECTION MÉDICALE ===
        addSectionHeader(document, "II. INFORMATIONS MÉDICALES", headerFont);
        
        document.add(new com.lowagie.text.Paragraph("Motif de visite:", boldFont));
        document.add(new com.lowagie.text.Paragraph(
                consultation.getReasonForVisit() != null ? consultation.getReasonForVisit() : "Non spécifié", 
                normalFont));
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));
        
        document.add(new com.lowagie.text.Paragraph("Diagnostic:", boldFont));
        document.add(new com.lowagie.text.Paragraph(
                consultation.getDiagnosis() != null ? consultation.getDiagnosis() : "Non spécifié", 
                normalFont));
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));
        
        document.add(new com.lowagie.text.Paragraph("Traitement:", boldFont));
        document.add(new com.lowagie.text.Paragraph(
                consultation.getTreatment() != null ? consultation.getTreatment() : "Non spécifié", 
                normalFont));
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));

        // === SECTION LABORATOIRE ===
        addSectionHeader(document, "III. EXAMENS DE LABORATOIRE", headerFont);
        
        // Examens prescrits
        List<PrescribedExam> prescribedExams = consultation.getPrescribedExams();
        if (prescribedExams != null && !prescribedExams.isEmpty()) {
            for (PrescribedExam exam : prescribedExams) {
                String examInfo = String.format("• %s - %s", 
                        exam.getServiceName(),
                        exam.getStatus() != null ? exam.getStatus().name() : "PRESCRIBED");
                document.add(new com.lowagie.text.Paragraph(examInfo, normalFont));
                
                if (exam.getDoctorNote() != null && !exam.getDoctorNote().isEmpty()) {
                    document.add(new com.lowagie.text.Paragraph("  Note: " + exam.getDoctorNote(), normalFont));
                }
                
                if (exam.getLabNote() != null && !exam.getLabNote().isEmpty()) {
                    document.add(new com.lowagie.text.Paragraph("  Résultat: " + exam.getLabNote(), normalFont));
                }
            }
        } else {
            document.add(new com.lowagie.text.Paragraph("Aucun examen prescrit", normalFont));
        }
        
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));

        // === SECTION FINANCE ===
        addSectionHeader(document, "IV. INFORMATIONS FINANCIÈRES", headerFont);
        
        Double totalAmount = calculateTotalAmount(consultation);
        Double amountPaid = calculateAmountPaid(consultation);
        Double remainingCredit = totalAmount - amountPaid;
        if (remainingCredit < 0) remainingCredit = 0.0;
        
        document.add(new com.lowagie.text.Paragraph(String.format("Montant Total: %.2f CFA", totalAmount), boldFont));
        document.add(new com.lowagie.text.Paragraph(String.format("Montant Payé: %.2f CFA", amountPaid), boldFont));
        
        String creditStatus = remainingCredit > 0 ? String.format("RESTE À PAYER: %.2f CFA", remainingCredit) : "SOLDE";
        com.lowagie.text.Font statusFont = remainingCredit > 0 
                ? new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12, com.lowagie.text.Font.BOLD, java.awt.Color.RED)
                : new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12, com.lowagie.text.Font.BOLD, new java.awt.Color(0, 128, 0));
        
        document.add(new com.lowagie.text.Paragraph(creditStatus, statusFont));
        
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));
        document.add(new com.lowagie.text.Paragraph(" ", normalFont));

        // Pied de page
        com.lowagie.text.Paragraph footer = new com.lowagie.text.Paragraph(
                "Document généré automatiquement le " + LocalDateTime.now().format(DATETIME_FORMATTER) + 
                " | Hôpital - Système de Gestion",
                new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9, com.lowagie.text.Font.ITALIC));
        footer.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        document.add(footer);

        document.close();
        
        log.info("✅ [PATIENT_DOCUMENT] PDF généré avec succès: {}", filePath);
    }

    /**
     * Ajoute un titre de section au PDF
     */
    private void addSectionHeader(com.lowagie.text.Document document, String title, com.lowagie.text.Font font) throws Exception {
        com.lowagie.text.Paragraph section = new com.lowagie.text.Paragraph(title, font);
        section.setSpacingBefore(15);
        section.setSpacingAfter(10);
        document.add(section);
    }

    /**
     * Récupère tous les documents pour la réception
     */
    public List<PatientDocumentDTO> getAllDocuments() {
        return patientDocumentRepository.findAllOrderByCreatedAtDesc().stream()
                .map(PatientDocumentDTO::fromEntity)
                .toList();
    }

    /**
     * Recherche les documents par nom de patient
     */
    public List<PatientDocumentDTO> searchByPatientName(String patientName) {
        return patientDocumentRepository.findByPatientNameContaining(patientName).stream()
                .map(PatientDocumentDTO::fromEntity)
                .toList();
    }

    /**
     * Récupère un document par ID
     */
    public PatientDocumentDTO getDocumentById(Long id) {
        return patientDocumentRepository.findById(id)
                .map(PatientDocumentDTO::fromEntity)
                .orElse(null);
    }

    /**
     * Récupère le chemin du fichier PDF pour téléchargement
     */
    public String getFilePath(Long id) {
        return patientDocumentRepository.findById(id)
                .map(PatientDocument::getFilePath)
                .orElse(null);
    }

    /**
     * Crée un nouveau document (pour l'import manuel)
     */
    @Transactional
    public PatientDocumentDTO createDocument(PatientDocumentDTO dto) {
        log.info("📤 [PATIENT_DOCUMENT] Création d'un nouveau document: {}", dto.getPatientName());
        
        try {
            // Le type de document est déjà un Enum depuis le DTO
            DocumentType docType = dto.getDocumentType();
            
            // Fallback: si null, utiliser DOSSIER_PATIENT par défaut
            if (docType == null) {
                docType = DocumentType.DOSSIER_PATIENT;
            }
            
            // Récupérer le chemin du fichier stocké (filePath doit être le chemin absolu du système de fichiers)
            String fileSystemPath = dto.getFilePath();
            String fileUrl = dto.getFileUrl();
            
            // Si filePath est null ou c'est une URL, utiliser fileUrl
            if (fileSystemPath == null || fileSystemPath.isEmpty()) {
                fileSystemPath = fileUrl;
            }
            
            // Normaliser le chemin: convertir les URL en chemins de fichiers si nécessaire
            if (fileSystemPath != null && fileSystemPath.contains("/hospital_uploads/")) {
                // C'est une URL relative, convertir en chemin absolu
                String homeDir = System.getProperty("user.home");
                fileSystemPath = homeDir + fileSystemPath;
            }
            
            PatientDocument document = PatientDocument.builder()
                    .fileName(dto.getFileName())
                    .filePath(fileSystemPath)  // CORRECT: stocke le chemin du système de fichiers
                    .fileUrl(fileUrl)
                    .documentType(docType)
                    .patientId(dto.getPatientId())
                    .patientName(dto.getPatientName())
                    .totalAmount(dto.getTotalAmount() != null ? dto.getTotalAmount() : 0.0)
                    .amountPaid(dto.getAmountPaid() != null ? dto.getAmountPaid() : 0.0)
                    .remainingCredit(dto.getRemainingCredit() != null ? dto.getRemainingCredit() : 0.0)
                    .paymentStatus(dto.getPaymentStatus() != null ? dto.getPaymentStatus() : "NON_PAYE")
                    .build();
            
            document = patientDocumentRepository.save(document);
            
            log.info("✅ [PATIENT_DOCUMENT] Document créé avec succès: {}", document.getId());
            
            return PatientDocumentDTO.fromEntity(document);
            
        } catch (Exception e) {
            log.error("❌ [PATIENT_DOCUMENT] Erreur lors de la création du document: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la création du document: " + e.getMessage(), e);
        }
    }

    /**
     * ✅ NOUVEAU: Crée un document avec son contenu binaire stocké en PostgreSQL
     * Compatible avec Render (filesystem éphémère)
     * 
     * @param dto Les métadonnées du document
     * @param content Le contenu binaire du fichier
     * @return Le document créé
     */
    @Transactional
    public PatientDocument createDocumentWithContent(PatientDocumentDTO dto, byte[] content) {
        log.info("📤 [PATIENT_DOCUMENT] Création d'un document avec contenu BDD: {} ({} bytes)", 
                dto.getFileName(), content.length);
        
        try {
            DocumentType docType = dto.getDocumentType();
            if (docType == null) {
                docType = DocumentType.DOSSIER_PATIENT;
            }
            
            PatientDocument document = PatientDocument.builder()
                    .fileName(dto.getFileName())
                    .filePath(dto.getFilePath())
                    .fileUrl(dto.getFileUrl())
                    .documentType(docType)
                    .patientId(dto.getPatientId())
                    .patientName(dto.getPatientName())
                    .totalAmount(dto.getTotalAmount() != null ? dto.getTotalAmount() : 0.0)
                    .amountPaid(dto.getAmountPaid() != null ? dto.getAmountPaid() : 0.0)
                    .remainingCredit(dto.getRemainingCredit() != null ? dto.getRemainingCredit() : 0.0)
                    .paymentStatus(dto.getPaymentStatus() != null ? dto.getPaymentStatus() : "NON_PAYE")
                    .content(content)  // ✅ Stockage binaire dans PostgreSQL
                    .fileSize(dto.getFileSize())
                    .mimeType(dto.getMimeType())
                    .build();
            
            document = patientDocumentRepository.save(document);
            
            log.info("✅ [PATIENT_DOCUMENT] Document avec contenu créé: {} (ID: {})", 
                    document.getFileName(), document.getId());
            
            return document;
            
        } catch (Exception e) {
            log.error("❌ [PATIENT_DOCUMENT] Erreur création document avec contenu: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la création du document: " + e.getMessage(), e);
        }
    }

    /**
     * ✅ NOUVEAU: Récupère le contenu binaire d'un document depuis PostgreSQL
     * 
     * @param id ID du document
     * @return Le contenu binaire ou null si non trouvé
     */
    @Transactional(readOnly = true)
    public byte[] getDocumentContent(Long id) {
        return patientDocumentRepository.findById(id)
                .map(PatientDocument::getContent)
                .orElse(null);
    }

    /**
     * Supprime un document (fichier et entrée en base de données)
     * @param id ID du document à supprimer
     */
    @Transactional
    public void deleteDocument(Long id) {
        log.info("🗑️ [PATIENT_DOCUMENT] Suppression du document ID: {}", id);
        
        try {
            // Récupérer le document
            PatientDocument document = patientDocumentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé: " + id));
            
            // Supprimer le fichier physique si possible
            if (document.getFilePath() != null) {
                File file = new File(document.getFilePath());
                if (file.exists()) {
                    if (file.delete()) {
                        log.info("✅ [PATIENT_DOCUMENT] Fichier supprimé: {}", document.getFilePath());
                    } else {
                        log.warn("⚠️ [PATIENT_DOCUMENT] Impossible de supprimer le fichier: {}", document.getFilePath());
                    }
                }
            }
            
            // Supprimer l'entrée en base de données
            patientDocumentRepository.delete(document);
            
            log.info("✅ [PATIENT_DOCUMENT] Document supprimé avec succès: {}", id);
            
        } catch (Exception e) {
            log.error("❌ [PATIENT_DOCUMENT] Erreur lors de la suppression: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la suppression du document: " + e.getMessage(), e);
        }
    }
}

