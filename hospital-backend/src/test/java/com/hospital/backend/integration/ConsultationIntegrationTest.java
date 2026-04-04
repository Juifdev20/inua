package com.hospital.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.ExamItemDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
@Transactional
class ConsultationIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private ConsultationRepository consultationRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MedicalServiceRepository serviceRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private Patient patient;
    private User doctor;
    private MedicalService medicalService;
    private Consultation consultation;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();

        // Créer un patient
        patient = Patient.builder()
            .firstName("John")
            .lastName("Doe")
            .phoneNumber("123456789")
            .build();
        patient = patientRepository.save(patient);

        // Créer un docteur
        doctor = User.builder()
            .firstName("Dr. Smith")
            .lastName("Johnson")
            .email("doctor@hospital.com")
            .build();
        doctor = userRepository.save(doctor);

        // Créer un service médical
        medicalService = MedicalService.builder()
            .nom("Blood Test")
            .prix(50.0)
            .isActive(true)
            .build();
        medicalService = serviceRepository.save(medicalService);

        // Créer une consultation
        consultation = Consultation.builder()
            .patient(patient)
            .doctor(doctor)
            .status(ConsultationStatus.EN_ATTENTE)
            .poids("70")
            .temperature("37.5")
            .taille("175")
            .tensionArterielle("120/80")
            .reasonForVisit("Headache")
            .examAmountPaid(BigDecimal.ZERO)
            .build();
        consultation = consultationRepository.save(consultation);
    }

    @Test
    @WithMockUser(authorities = {"ROLE_DOCTEUR"})
    void testCompleteConsultationWorkflow() throws Exception {
        // 1. Récupérer la consultation
        mockMvc.perform(get("/api/v1/consultations/{id}", consultation.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(consultation.getId()))
            .andExpect(jsonPath("$.data.poids").value("70"))
            .andExpect(jsonPath("$.data.reasonForVisit").value("Headache"));

        // 2. Mettre à jour avec diagnostic et examens (docteur)
        ConsultationDTO updateDTO = ConsultationDTO.builder()
            .diagnosis("Migraine")
            .exams(List.of(new ExamItemDTO(medicalService.getId(), "Routine blood test")))
            .examAmountPaid(BigDecimal.valueOf(25.0))
            .build();

        mockMvc.perform(put("/api/v1/consultations/{id}", consultation.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDTO)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.diagnosis").value("Migraine"))
            .andExpect(jsonPath("$.data.exams").isArray())
            .andExpect(jsonPath("$.data.exams[0].serviceId").value(medicalService.getId()))
            .andExpect(jsonPath("$.data.examAmountPaid").value(25.0));

        // 3. Transiter vers ATTENTE_PAIEMENT_LABO
        mockMvc.perform(put("/api/v1/consultations/{id}/status", consultation.getId())
                .param("status", "ATTENTE_PAIEMENT_LABO"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("ATTENTE_PAIEMENT_LABO"));

        // 4. Envoyer au laboratoire
        mockMvc.perform(post("/api/v1/consultations/{id}/send-to-lab", consultation.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("LABORATOIRE_EN_ATTENTE"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_RECEPTION"})
    void testReceptionCanUpdateVitalsButNotMedicalFields() throws Exception {
        // La réception met à jour les signes vitaux
        ConsultationDTO updateDTO = ConsultationDTO.builder()
            .poids("75")
            .temperature("38.0")
            .taille("180")
            .tensionArterielle("130/85")
            .reasonForVisit("Updated reason")
            .build();

        mockMvc.perform(put("/api/v1/consultations/{id}", consultation.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDTO)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.poids").value("75"))
            .andExpect(jsonPath("$.data.temperature").value("38.0"))
            .andExpect(jsonPath("$.data.taille").value("180"))
            .andExpect(jsonPath("$.data.tensionArterielle").value("130/85"))
            .andExpect(jsonPath("$.data.reasonForVisit").value("Updated reason"));
    }

    @Test
    void testPublicServicesEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/services"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data[0].id").value(medicalService.getId()))
            .andExpect(jsonPath("$.data[0].nom").value("Blood Test"))
            .andExpect(jsonPath("$.data[0].prix").value(50.0));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_DOCTEUR"})
    void testDoctorDashboardWithVitals() throws Exception {
        mockMvc.perform(get("/api/v1/doctors/{doctorId}/dashboard", doctor.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.rdvs_today").isArray())
            .andExpect(jsonPath("$.data.rdvs_today[?(@.id == " + consultation.getId() + ")]").exists())
            .andExpect(jsonPath("$.data.rdvs_today[?(@.id == " + consultation.getId() + ")].poids").value("70"))
            .andExpect(jsonPath("$.data.rdvs_today[?(@.id == " + consultation.getId() + ")].temperature").value("37.5"))
            .andExpect(jsonPath("$.data.rdvs_today[?(@.id == " + consultation.getId() + ")].taille").value("175"))
            .andExpect(jsonPath("$.data.rdvs_today[?(@.id == " + consultation.getId() + ")].tensionArterielle").value("120/80"))
            .andExpect(jsonPath("$.data.rdvs_today[?(@.id == " + consultation.getId() + ")].motif").value("Headache"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_DOCTEUR"})
    void testStatusTransitionWorkflow() throws Exception {
        // ARRIVED -> EN_ATTENTE
        consultation.setStatus(ConsultationStatus.ARRIVED);
        consultationRepository.save(consultation);

        mockMvc.perform(put("/api/v1/consultations/{id}/status", consultation.getId())
                .param("status", "EN_ATTENTE"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("EN_ATTENTE"));

        // EN_ATTENTE -> ATTENTE_PAIEMENT_LABO
        mockMvc.perform(put("/api/v1/consultations/{id}/status", consultation.getId())
                .param("status", "ATTENTE_PAIEMENT_LABO"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("ATTENTE_PAIEMENT_LABO"));

        // ATTENTE_PAIEMENT_LABO -> LABORATOIRE_EN_ATTENTE
        mockMvc.perform(put("/api/v1/consultations/{id}/status", consultation.getId())
                .param("status", "LABORATOIRE_EN_ATTENTE"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("LABORATOIRE_EN_ATTENTE"));
    }
}
