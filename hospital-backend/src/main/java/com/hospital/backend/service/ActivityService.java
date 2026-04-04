package com.hospital.backend.service;

import com.hospital.backend.entity.Activity;
import com.hospital.backend.repository.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class ActivityService {

    @Autowired
    private ActivityRepository activityRepository;

    /**
     * Enregistre une activité dans la base de données
     * @param action Le titre de l'action (ex: "Création")
     * @param details La description (ex: "Docteur Diallo ajouté")
     * @param type Le style (success, info, warning, error)
     */
    public void log(String action, String details, String type) {
        Activity activity = Activity.builder()
                .action(action)
                .details(details)
                .type(type)
                .utilisateur("Admin") // Tu pourras dynamiser cela avec Spring Security plus tard
                .date(LocalDateTime.now())
                .build();

        activityRepository.save(activity);
    }
}