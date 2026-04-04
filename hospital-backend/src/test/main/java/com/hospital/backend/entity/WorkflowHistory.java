package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "workflow_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private DocumentWorkflow workflow;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "from_step")
    private WorkflowStep fromStep;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "to_step")
    private WorkflowStep toStep;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "action_by")
    private User actionBy;
    
    private String action;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
