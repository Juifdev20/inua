package com.hospital.backend.repository;

import com.hospital.backend.entity.DocumentWorkflow;
import com.hospital.backend.entity.WorkflowStatus;
import com.hospital.backend.entity.WorkflowStep;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentWorkflowRepository extends JpaRepository<DocumentWorkflow, Long> {
    
    Optional<DocumentWorkflow> findByWorkflowCode(String workflowCode);
    
    Page<DocumentWorkflow> findByPatientId(Long patientId, Pageable pageable);
    
    Page<DocumentWorkflow> findByCurrentStep(WorkflowStep step, Pageable pageable);
    
    Page<DocumentWorkflow> findByStatus(WorkflowStatus status, Pageable pageable);
    
    @Query("SELECT w FROM DocumentWorkflow w WHERE w.currentHandler.id = :handlerId AND w.status = 'EN_COURS'")
    List<DocumentWorkflow> findActiveWorkflowsByHandler(@Param("handlerId") Long handlerId);
    
    @Query("SELECT w FROM DocumentWorkflow w WHERE w.currentStep = :step AND w.status = 'EN_COURS'")
    List<DocumentWorkflow> findActiveWorkflowsByStep(@Param("step") WorkflowStep step);
}
