package com.hospital.backend.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchResultRequest {
    private List<Long> testIds;
    private Map<String, String> results;
    private String interpretation;
    private Long technicianId;
    private Long doctorId;
}

