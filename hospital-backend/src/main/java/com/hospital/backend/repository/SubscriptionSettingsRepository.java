package com.hospital.backend.repository;

import com.hospital.backend.entity.SubscriptionSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriptionSettingsRepository extends JpaRepository<SubscriptionSettings, Long> {
}
