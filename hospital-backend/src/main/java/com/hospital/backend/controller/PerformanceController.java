package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.lang.management.*;
import java.util.*;

@RestController
@RequestMapping("/api/superadmin/metrics")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000"})
public class PerformanceController {

    private final MeterRegistry meterRegistry;

    @GetMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> getMetrics() {
        try {
            Map<String, Object> result = new LinkedHashMap<>();

            // JVM Memory
            MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
            MemoryUsage heap = memBean.getHeapMemoryUsage();
            MemoryUsage nonHeap = memBean.getNonHeapMemoryUsage();

            Map<String, Object> memory = new LinkedHashMap<>();
            memory.put("heapUsedMB",  heap.getUsed()  / 1024 / 1024);
            memory.put("heapMaxMB",   heap.getMax()   / 1024 / 1024);
            memory.put("heapCommittedMB", heap.getCommitted() / 1024 / 1024);
            memory.put("heapUsedPercent", heap.getMax() > 0
                    ? Math.round((double) heap.getUsed() / heap.getMax() * 100) : 0);
            memory.put("nonHeapUsedMB", nonHeap.getUsed() / 1024 / 1024);
            result.put("memory", memory);

            // CPU
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            Map<String, Object> cpu = new LinkedHashMap<>();
            cpu.put("availableProcessors", osBean.getAvailableProcessors());
            cpu.put("systemLoadAverage", osBean.getSystemLoadAverage());
            if (osBean instanceof com.sun.management.OperatingSystemMXBean sunOs) {
                double processCpu = sunOs.getProcessCpuLoad() * 100;
                double systemCpu  = sunOs.getCpuLoad() * 100;
                cpu.put("processCpuPercent", Math.round(processCpu * 10.0) / 10.0);
                cpu.put("systemCpuPercent",  Math.round(systemCpu  * 10.0) / 10.0);
            }
            result.put("cpu", cpu);

            // Threads
            ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
            Map<String, Object> threads = new LinkedHashMap<>();
            threads.put("live",       threadBean.getThreadCount());
            threads.put("peak",       threadBean.getPeakThreadCount());
            threads.put("daemon",     threadBean.getDaemonThreadCount());
            threads.put("totalStarted", threadBean.getTotalStartedThreadCount());
            result.put("threads", threads);

            // JVM uptime
            RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
            long uptimeMs = runtimeBean.getUptime();
            Map<String, Object> runtime = new LinkedHashMap<>();
            runtime.put("uptimeSeconds", uptimeMs / 1000);
            runtime.put("uptimeFormatted", formatUptime(uptimeMs));
            runtime.put("jvmName", runtimeBean.getVmName());
            runtime.put("jvmVersion", runtimeBean.getVmVersion());
            result.put("runtime", runtime);

            // Micrometer - HTTP metrics (if available)
            try {
                Map<String, Object> http = new LinkedHashMap<>();
                meterRegistry.find("http.server.requests").timers().stream()
                        .limit(10)
                        .forEach(t -> {
                            String key = t.getId().getTag("uri") + " [" + t.getId().getTag("method") + "]";
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("count",     t.count());
                            m.put("meanMs",    Math.round(t.mean(java.util.concurrent.TimeUnit.MILLISECONDS) * 10.0) / 10.0);
                            m.put("maxMs",     Math.round(t.max(java.util.concurrent.TimeUnit.MILLISECONDS)  * 10.0) / 10.0);
                            m.put("totalSec",  Math.round(t.totalTime(java.util.concurrent.TimeUnit.SECONDS) * 100.0) / 100.0);
                            http.put(key, m);
                        });
                result.put("httpRequests", http);
            } catch (Exception ignored) {}

            // GC info
            List<Map<String, Object>> gcList = new ArrayList<>();
            for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans()) {
                Map<String, Object> gcInfo = new LinkedHashMap<>();
                gcInfo.put("name",       gc.getName());
                gcInfo.put("count",      gc.getCollectionCount());
                gcInfo.put("timeMs",     gc.getCollectionTime());
                gcList.add(gcInfo);
            }
            result.put("gc", gcList);

            result.put("collectedAt", java.time.LocalDateTime.now().toString());
            return ResponseEntity.ok(ApiResponse.success("Metriques systeme", result));

        } catch (Exception e) {
            log.error("[Metrics] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur metriques: " + e.getMessage()));
        }
    }

    private String formatUptime(long ms) {
        long seconds = ms / 1000;
        long days    = seconds / 86400;
        long hours   = (seconds % 86400) / 3600;
        long minutes = (seconds % 3600) / 60;
        if (days > 0) return days + "j " + hours + "h " + minutes + "m";
        if (hours > 0) return hours + "h " + minutes + "m";
        return minutes + "m";
    }
}
