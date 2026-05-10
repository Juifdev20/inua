package com.hospital.backend.dto;

import com.hospital.backend.entity.QueueType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PatientQueueDTO {
    private Long id;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private QueueType queueType;
    private Double amount;
    private Boolean paid;
    private LocalDateTime createdAt;
}