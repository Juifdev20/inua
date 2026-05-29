package com.hospital.backend.service;

/**
 * ★ SERVICE D'ENVOI D'EMAILS
 * Interface pour l'envoi de notifications email
 */
public interface EmailService {

    /**
     * Envoie les credentials de connexion à un nouvel utilisateur
     * @param to Adresse email du destinataire
     * @param firstName Prénom de l'utilisateur
     * @param lastName Nom de l'utilisateur
     * @param username Identifiant généré
     * @param tempPassword Mot de passe temporaire
     * @param userType Type d'utilisateur (PATIENT ou STAFF)
     */
    void sendCredentialsEmail(String to, String firstName, String lastName, 
                             String username, String tempPassword, String userType);

    /**
     * Envoie un email de réinitialisation de mot de passe
     * @param to Adresse email du destinataire
     * @param firstName Prénom de l'utilisateur
     * @param resetToken Token de réinitialisation
     */
    void sendPasswordResetEmail(String to, String firstName, String resetToken);

    /**
     * Envoie un email de confirmation de rendez-vous
     * @param to Adresse email du patient
     * @param patientName Nom du patient
     * @param appointmentDate Date du rendez-vous
     * @param doctorName Nom du médecin
     * @param department Département
     */
    void sendAppointmentConfirmation(String to, String patientName, String appointmentDate, 
                                      String doctorName, String department);

    /**
     * Envoie un email de rappel de rendez-vous
     * @param to Adresse email du patient
     * @param patientName Nom du patient
     * @param appointmentDate Date du rendez-vous
     * @param doctorName Nom du médecin
     */
    void sendAppointmentReminder(String to, String patientName, String appointmentDate, 
                                String doctorName);

    /**
     * Envoie un email générique (pour tests ou cas spéciaux)
     * @param to Adresse email du destinataire
     * @param subject Sujet de l'email
     * @param htmlContent Contenu HTML de l'email
     */
    void sendHtmlEmail(String to, String subject, String htmlContent);

    /**
     * ★ Envoie un email avec le code de connexion temporaire (Magic Code)
     * @param to Adresse email du destinataire
     * @param firstName Prénom de l'utilisateur
     * @param code Code à 6 chiffres pour connexion sans mot de passe
     */
    void sendMagicCodeEmail(String to, String firstName, String code);

    /**
     * ★ Envoie un email de notification quand une prescription est prête
     * @param to Adresse email du patient
     * @param patientName Nom du patient
     * @param prescriptionCode Code de la prescription
     * @param doctorName Nom du médecin prescripteur
     */
    void sendPrescriptionReadyEmail(String to, String patientName, String prescriptionCode, String doctorName);
}
