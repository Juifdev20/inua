package com.hospital.backend.mapper;

import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.entity.Consultation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ConsultationMapper {

    /**
     * ✅ Convertir une Entité Consultation en DTO
     * 🔧 AVEC LOGS DÉTAILLÉS POUR DEBUG
     */
    public ConsultationDTO toDto(Consultation consultation) {
        if (consultation == null) {
            log.warn("⚠️ ConsultationMapper.toDto() - Consultation est NULL!");
            return null;
        }

        log.info("🔍 Mapping Consultation ID: {} vers DTO", consultation.getId());

        // 🔧 VÉRIFICATION PRÉALABLE
        if (consultation.getPatient() == null) {
            log.warn("⚠️ Consultation {} n'a PAS de patient!", consultation.getId());
        } else {
            log.info("✅ Patient trouvé: ID={}, Name={} {}",
                    consultation.getPatient().getId(),
                    consultation.getPatient().getFirstName(),
                    consultation.getPatient().getLastName());
        }

        if (consultation.getDoctor() == null) {
            log.warn("⚠️ Consultation {} n'a PAS de docteur!", consultation.getId());
        } else {
            log.info("✅ Doctor trouvé: ID={}, Name={} {}",
                    consultation.getDoctor().getId(),
                    consultation.getDoctor().getFirstName(),
                    consultation.getDoctor().getLastName());
        }

        ConsultationDTO dto = ConsultationDTO.builder()
                // --- IDENTIFIANTS ---
                .id(consultation.getId())
                .consultationCode(consultation.getConsultationCode())

                // --- DATES ---
                .consultationDate(consultation.getConsultationDate())
                .createdAt(consultation.getCreatedAt())
                .updatedAt(consultation.getUpdatedAt())

                // --- RAISON DE LA VISITE ---
                .reasonForVisit(consultation.getReasonForVisit())

                // --- PARAMÈTRES VITAUX ---
                .poids(consultation.getPoids())
                .temperature(consultation.getTemperature())
                .taille(consultation.getTaille())
                .tensionArterielle(consultation.getTensionArterielle())

                // --- DONNÉES MÉDICALES ---
                .symptoms(consultation.getSymptoms())
                .diagnosis(consultation.getDiagnosis())
                .treatment(consultation.getTreatment())
                .notes(consultation.getNotes())

                // --- STATUT ET ÉTAT ---
                .status(consultation.getStatus())
                .isHospitalized(consultation.getIsHospitalized())

                // --- HOSPITALISATION ---
                .dateEntree(consultation.getDateEntree())
                .dateSortie(consultation.getDateSortie())

                // --- TESTS ET PRESCRIPTIONS ---
                .requiresLabTest(consultation.getRequiresLabTest())
                .requiresPrescription(consultation.getRequiresPrescription())

                // --- FRAIS ---
                .fraisFiche(consultation.getFraisFiche())

                // ================== 🔧 CRUCIAL: MAPPER PATIENT ==================
                .patientId(consultation.getPatient() != null ? consultation.getPatient().getId() : null)
                .patientName(consultation.getPatient() != null ?
                        consultation.getPatient().getFirstName() + " " +
                                consultation.getPatient().getLastName() : null)

                // ================== 🔧 CRUCIAL: MAPPER DOCTOR ==================
                .doctorId(consultation.getDoctor() != null ? consultation.getDoctor().getId() : null)
                .doctorName(consultation.getDoctor() != null ?
                        consultation.getDoctor().getFirstName() + " " +
                                consultation.getDoctor().getLastName() : null)

                // ================== 🔧 MAPPER DEPARTMENT ==================
                .departmentName(consultation.getDoctor() != null &&
                        consultation.getDoctor().getDepartment() != null ?
                        consultation.getDoctor().getDepartment().getNom() : null)
                // --- VALIDATION ET SIGNATURE ---
                .numeroFiche(consultation.getNumeroFiche())
                .dateValidation(consultation.getDateValidation())
                .signataireId(consultation.getSignataireId())
                .signatureImage(consultation.getSignatureImage())
                .isValidated(consultation.getIsValidated())

                .build();


        // 🔍 VÉRIFICATION POST-MAPPING
        log.info("📊 DTO MAPPÉ:");
        log.info("   ✅ ID: {}", dto.getId());
        log.info("   ✅ PatientId: {}", dto.getPatientId());
        log.info("   ✅ PatientName: {}", dto.getPatientName());
        log.info("   ✅ DoctorId: {}", dto.getDoctorId());
        log.info("   ✅ DoctorName: {}", dto.getDoctorName());
        log.info("   ✅ Department: {}", dto.getDepartmentName());
        log.info("   ✅ Status: {}", dto.getStatus());

        return dto;
    }

    /**
     * ✅ Convertir un DTO ConsultationDTO en Entité Consultation
     * 🔧 UTILISÉ POUR LES CRÉATIONS/MISES À JOUR
     */
    public Consultation toEntity(ConsultationDTO dto) {
        if (dto == null) {
            log.warn("⚠️ ConsultationMapper.toEntity() - DTO est NULL!");
            return null;
        }

        log.info("🔍 Mapping DTO vers Consultation Entity");

        return Consultation.builder()
                // --- IDENTIFIANTS ---
                .id(dto.getId())
                .consultationCode(dto.getConsultationCode())

                // --- DATES ---
                .consultationDate(dto.getConsultationDate())
                .createdAt(dto.getCreatedAt())
                .updatedAt(dto.getUpdatedAt())

                // --- RAISON DE LA VISITE ---
                .reasonForVisit(dto.getReasonForVisit())

                // --- PARAMÈTRES VITAUX ---
                .poids(dto.getPoids())
                .temperature(dto.getTemperature())
                .taille(dto.getTaille())
                .tensionArterielle(dto.getTensionArterielle())

                // --- DONNÉES MÉDICALES ---
                .symptoms(dto.getSymptoms())
                .diagnosis(dto.getDiagnosis())
                .treatment(dto.getTreatment())
                .notes(dto.getNotes())

                // --- STATUT ET ÉTAT ---
                .status(dto.getStatus())
                .isHospitalized(dto.getIsHospitalized() != null ? dto.getIsHospitalized() : false)

                // --- HOSPITALISATION ---
                .dateEntree(dto.getDateEntree())
                .dateSortie(dto.getDateSortie())

                // --- TESTS ET PRESCRIPTIONS ---
                .requiresLabTest(dto.getRequiresLabTest() != null ? dto.getRequiresLabTest() : false)
                .requiresPrescription(dto.getRequiresPrescription() != null ? dto.getRequiresPrescription() : false)

                // --- FRAIS ---
                .fraisFiche(dto.getFraisFiche())
                // --- VALIDATION ET SIGNATURE ---
                .numeroFiche(dto.getNumeroFiche())
                .dateValidation(dto.getDateValidation())
                .signataireId(dto.getSignataireId())
                .signatureImage(dto.getSignatureImage())
                .isValidated(dto.getIsValidated() != null ? dto.getIsValidated() : false)

                .build();
    }

    /**
     * ✅ Méthode utilitaire pour vérifier l'intégrité du mapping
     */
    public void validateMapping(Consultation consultation, ConsultationDTO dto) {
        log.info("🔍 VALIDATION DU MAPPING:");

        if (consultation.getPatient() != null && dto.getPatientId() == null) {
            log.error("❌ ERREUR: Patient présent dans l'entity mais patientId est NULL dans le DTO!");
        }

        if (consultation.getDoctor() != null && dto.getDoctorId() == null) {
            log.error("❌ ERREUR: Doctor présent dans l'entity mais doctorId est NULL dans le DTO!");
        }

        if (consultation.getPatient() == null && dto.getPatientId() != null) {
            log.warn("⚠️ ATTENTION: Patient NULL dans l'entity mais patientId est défini dans le DTO!");
        }

        log.info("✅ Validation du mapping terminée");
    }
}