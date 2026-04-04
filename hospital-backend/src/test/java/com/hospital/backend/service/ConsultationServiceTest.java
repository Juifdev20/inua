package com.hospital.backend.service;

import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.ExamItemDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.impl.ConsultationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.when;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsultationServiceTest {

    @Mock
    private ConsultationRepository consultationRepository;
    
    @Mock
    private PatientRepository patientRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private MedicalServiceRepository serviceRepository;

    @InjectMocks
    private ConsultationServiceImpl consultationService;

    private Consultation consultation;
    private ConsultationDTO consultationDTO;
    private Patient patient;
    private User doctor;
    private MedicalService medicalService;

    @BeforeEach
    void setUp() {
        patient = Patient.builder()
            .id(1L)
            .firstName("John")
            .lastName("Doe")
            .build();

        doctor = User.builder()
            .id(1L)
            .firstName("Dr. Smith")
            .lastName("Johnson")
            .build();

        medicalService = MedicalService.builder()
            .id(1L)
            .nom("Blood Test")
            .prix(50.0)
            .isActive(true)
            .build();

        consultation = Consultation.builder()
            .id(1L)
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

        consultationDTO = ConsultationDTO.builder()
            .id(1L)
            .patientId(1L)
            .doctorId(1L)
            .status(ConsultationStatus.EN_ATTENTE)
            .poids("70")
            .temperature("37.5")
            .taille("175")
            .tensionArterielle("120/80")
            .reasonForVisit("Headache")
            .examAmountPaid(BigDecimal.valueOf(25.0))
            .exams(List.of(new ExamItemDTO(1L, "Routine check")))
            .build();
    }

    @Test
    void testGetById_Success() {
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(consultation));

        ConsultationDTO result = consultationService.getById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("John Doe", result.getPatientName());
        verify(consultationRepository).findById(1L);
    }

    @Test
    void testGetById_NotFound() {
        when(consultationRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> consultationService.getById(1L));
        verify(consultationRepository).findById(1L);
    }

    @Test
    void testUpdate_DoctorRole_CannotModifyVitals() {
        mockSecurityContext("ROLE_DOCTEUR");
        
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class))).thenReturn(consultation);

        ConsultationDTO result = consultationService.update(1L, consultationDTO);

        assertNotNull(result);
        // Vérifier que les signes vitaux ne sont pas modifiés par le docteur
        verify(consultationRepository).save(argThat(c -> 
            c.getPoids().equals("70") && // Valeur originale inchangée
            c.getTemperature().equals("37.5") &&
            c.getTaille().equals("175") &&
            c.getTensionArterielle().equals("120/80")
        ));
    }

    @Test
    void testUpdate_ReceptionRole_CanModifyVitals() {
        mockSecurityContext("ROLE_RECEPTION");
        
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class))).thenReturn(consultation);

        consultationDTO.setPoids("75");
        consultationDTO.setTemperature("38.0");
        
        ConsultationDTO result = consultationService.update(1L, consultationDTO);

        assertNotNull(result);
        verify(consultationRepository).save(argThat(c -> 
            c.getPoids().equals("75") && // Valeur modifiée
            c.getTemperature().equals("38.0") &&
            c.getReasonForVisit().equals("Headache")
        ));
    }

    @Test
    void testUpdate_WithExams_ValidatesServiceId() {
        mockSecurityContext("ROLE_DOCTEUR");
        
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(consultation));
        when(serviceRepository.findById(1L)).thenReturn(Optional.of(medicalService));
        when(consultationRepository.save(any(Consultation.class))).thenReturn(consultation);

        ConsultationDTO result = consultationService.update(1L, consultationDTO);

        assertNotNull(result);
        verify(serviceRepository).findById(1L);
        verify(consultationRepository).save(argThat(c -> 
            c.getExams() != null && 
            c.getExams().size() == 1 &&
            c.getExams().get(0).getServiceId().equals(1L)
        ));
    }

    @Test
    void testUpdate_WithInvalidServiceId_ThrowsException() {
        mockSecurityContext("ROLE_DOCTEUR");
        
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(consultation));
        when(serviceRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> 
            consultationService.update(1L, consultationDTO));
        
        verify(serviceRepository).findById(1L);
        verify(consultationRepository, never()).save(any());
    }

    @Test
    void testUpdate_StatusTransition_Logged() {
        mockSecurityContext("ROLE_DOCTEUR");
        
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class))).thenReturn(consultation);

        consultationDTO.setStatus(ConsultationStatus.ATTENTE_PAIEMENT_LABO);
        
        ConsultationDTO result = consultationService.update(1L, consultationDTO);

        assertNotNull(result);
        verify(consultationRepository).save(argThat(c -> 
            c.getStatus().equals(ConsultationStatus.ATTENTE_PAIEMENT_LABO)
        ));
    }

    @Test
    void testUpdate_ExamAmountPaid() {
        mockSecurityContext("ROLE_RECEPTION");
        
        when(consultationRepository.findById(1L)).thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class))).thenReturn(consultation);

        consultationDTO.setExamAmountPaid(BigDecimal.valueOf(100.0));
        
        ConsultationDTO result = consultationService.update(1L, consultationDTO);

        assertNotNull(result);
        verify(consultationRepository).save(argThat(c -> 
            c.getExamAmountPaid().equals(BigDecimal.valueOf(100.0))
        ));
    }

    private void mockSecurityContext(String role) {
        Authentication authentication = mock(Authentication.class);
        GrantedAuthority authority = mock(GrantedAuthority.class);
        
        when(authentication.getAuthorities()).thenReturn(List.of(authority));
        when(authority.getAuthority()).thenReturn(role);
        
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }
}
