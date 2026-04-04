package com.hospital.backend.repository;

import com.hospital.backend.entity.WorkflowHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkflowHistoryRepository extends JpaRepository<WorkflowHistory, Long> {
    
    List<WorkflowHistory> findByWorkflowIdOrderByCreatedAtAsc(Long workflowId);
}
