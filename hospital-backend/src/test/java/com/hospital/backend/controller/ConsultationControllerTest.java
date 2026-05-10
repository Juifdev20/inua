package com.hospital.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.ExamItemDTO;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.service.ConsultationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ConsultationController.class)
class ConsultationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConsultationService consultationService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(authorities = {"ROLE_DOCTEUR"})
    void testGetConsultationById_Success() throws Exception {
        ConsultationDTO consultation = ConsultationDTO.builder()
            .id(1L)
            .patientId(1L)
            .doctorId(1L)
            .status(ConsultationStatus.EN_ATTENTE)
            .patientName("John Doe")
            .poids("70")
            .temperature("37.5")
            .taille("175")
            .tensionArterielle("120/80")
            .reasonForVisit("Headache")
            .examAmountPaid(BigDecimal.ZERO)
            .build();

        when(consultationService.getById(1L)).thenReturn(consultation);

        mockMvc.perform(get("/api/v1/consultations/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(1))
            .andExpect(jsonPath("$.data.patientName").value("John Doe"))
            .andExpect(jsonPath("$.data.poids").value("70"))
            .andExpect(jsonPath("$.data.temperature").value("37.5"))
            .andExpect(jsonPath("$.data.examAmountPaid").value(0));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_DOCTEUR"})
    void testUpdateConsultation_WithExams_Success() throws Exception {
        ConsultationDTO updateDTO = ConsultationDTO.builder()
            .id(1L)
            .diagnosis("Migraine")
            .exams(List.of(new ExamItemDTO(1L, "Blood test")))
            .examAmountPaid(BigDecimal.valueOf(50.0))
            .status(ConsultationStatus.ATTENTE_PAIEMENT_LABO)
            .build();

        ConsultationDTO resultDTO = ConsultationDTO.builder()
            .id(1L)
            .diagnosis("Migraine")
            .exams(List.of(new ExamItemDTO(1L, "Blood test")))
            .examAmountPaid(BigDecimal.valueOf(50.0))
            .status(ConsultationStatus.ATTENTE_PAIEMENT_LABO)
            .build();

        when(consultationService.update(eq(1L), any(ConsultationDTO.class))).thenReturn(resultDTO);

        mockMvc.perform(put("/api/v1/consultations/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDTO)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.diagnosis").value("Migraine"))
            .andExpect(jsonPath("$.data.exams").isArray())
            .andExpect(jsonPath("$.data.exams[0].serviceId").value(1))
            .andExpect(jsonPath("$.data.exams[0].note").value("Blood test"))
            .andExpect(jsonPath("$.data.examAmountPaid").value(50.0))
            .andExpect(jsonPath("$.data.status").value("ATTENTE_PAIEMENT_LABO"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_RECEPTION"})
    void testUpdateConsultation_ReceptionRole_CanUpdateVitals() throws Exception {
        ConsultationDTO updateDTO = ConsultationDTO.builder()
            .id(1L)
            .poids("75")
            .temperature("38.0")
            .taille("180")
            .tensionArterielle("130/85")
            .reasonForVisit("Fever")
            .build();

        ConsultationDTO resultDTO = ConsultationDTO.builder()
            .id(1L)
            .poids("75")
            .temperature("38.0")
            .taille("180")
            .tensionArterielle("130/85")
            .reasonForVisit("Fever")
            .build();

        when(consultationService.update(eq(1L), any(ConsultationDTO.class))).thenReturn(resultDTO);

        mockMvc.perform(put("/api/v1/consultations/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDTO)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.poids").value("75"))
            .andExpect(jsonPath("$.data.temperature").value("38.0"))
            .andExpect(jsonPath("$.data.taille").value("180"))
            .andExpect(jsonPath("$.data.tensionArterielle").value("130/85"))
            .andExpect(jsonPath("$.data.reasonForVisit").value("Fever"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_DOCTEUR"})
    void testUpdateStatus_Success() throws Exception {
        ConsultationDTO resultDTO = ConsultationDTO.builder()
            .id(1L)
            .status(ConsultationStatus.ATTENTE_PAIEMENT_LABO)
            .build();

        when(consultationService.updateStatus(1L, ConsultationStatus.ATTENTE_PAIEMENT_LABO))
            .thenReturn(resultDTO);

        mockMvc.perform(put("/api/v1/consultations/1/status")
                .param("status", "ATTENTE_PAIEMENT_LABO"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("ATTENTE_PAIEMENT_LABO"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_DOCTEUR"})
    void testSendToLab_Success() throws Exception {
        ConsultationDTO resultDTO = ConsultationDTO.builder()
            .id(1L)
            .status(ConsultationStatus.LABORATOIRE_EN_ATTENTE)
            .build();

        when(consultationService.sendToLab(1L)).thenReturn(resultDTO);

        mockMvc.perform(post("/api/v1/consultations/1/send-to-lab"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("LABORATOIRE_EN_ATTENTE"));
    }

    @Test
    void testGetServices_PublicEndpoint_Success() throws Exception {
        mockMvc.perform(get("/api/v1/services"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray());
    }
}
