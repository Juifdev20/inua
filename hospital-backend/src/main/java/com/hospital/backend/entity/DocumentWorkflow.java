package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_workflow")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentWorkflow {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "workflow_code", unique = true, nullable = false)
    private String workflowCode;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id")
    private Consultation consultation;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "document_type")
    private DocumentType documentType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "current_step")
    private WorkflowStep currentStep;
    
    @Enumerated(EnumType.STRING)
    private WorkflowStatus status;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_handler")
    private User currentHandler;
    
    @Column(name = "reference_id")
    private Long referenceId;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (workflowCode == null) {
            workflowCode = "WRK-" + System.currentTimeMillis();
        }
        if (status == null) {
            status = WorkflowStatus.EN_COURS;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
