package com.hospital.backend.repository;

import com.hospital.backend.entity.SubscriptionPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {

    List<SubscriptionPayment> findByHospitalIdOrderByCreatedAtDesc(Long hospitalId);

    List<SubscriptionPayment> findByStatusOrderByCreatedAtDesc(String status);

    long countByStatus(String status);

    boolean existsByReference(String reference);
}
