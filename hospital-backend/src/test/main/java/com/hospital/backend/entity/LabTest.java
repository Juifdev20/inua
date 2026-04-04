package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_tests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabTest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "test_code", unique = true, nullable = false)
    private String testCode;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id", nullable = false)
    private Consultation consultation;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by")
    private User requestedBy;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    private User processedBy;
    
    @Column(name = "test_type", nullable = false)
    private String testType;
    
    @Column(name = "test_name", nullable = false)
    private String testName;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(columnDefinition = "TEXT")
    private String results;
    
    @Column(columnDefinition = "TEXT")
    private String interpretation;
    
    @Column(name = "normal_range")
    private String normalRange;
    
    @Enumerated(EnumType.STRING)
    private LabTestStatus status;
    
    @Column(name = "priority")
    @Enumerated(EnumType.STRING)
    private Priority priority;
    
    @Column(name = "requested_at")
    private LocalDateTime requestedAt;
    
    @Column(name = "processed_at")
    private LocalDateTime processedAt;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        requestedAt = LocalDateTime.now();
        if (testCode == null) {
            testCode = "LAB-" + System.currentTimeMillis();
        }
        if (status == null) {
            status = LabTestStatus.EN_ATTENTE;
        }
        if (priority == null) {
            priority = Priority.NORMALE;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
