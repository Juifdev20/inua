package com.hospital.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * ★ CONFIGURATION ASYNCHRONE
 * Configure le pool de threads pour l'envoi d'emails en arrière-plan
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * TaskExecutor pour les tâches d'envoi d'emails
     */
    @Bean(name = "taskExecutor")
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Nombre minimum de threads toujours actifs
        executor.setCorePoolSize(5);
        
        // Nombre maximum de threads
        executor.setMaxPoolSize(10);
        
        // Taille de la file d'attente
        executor.setQueueCapacity(100);
        
        // Préfixe pour les noms des threads
        executor.setThreadNamePrefix("email-task-");
        
        // Politique de rejet : exécuter dans le thread appelant si la file est pleine
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        
        // Initialisation
        executor.initialize();
        
        return executor;
    }

    /**
     * Executor générique pour d'autres tâches async
     */
    @Bean(name = "asyncExecutor")
    public Executor asyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(6);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("async-task-");
        executor.initialize();
        return executor;
    }
}
