package com.hospital.backend.service.impl;

import com.hospital.backend.entity.HospitalConfig;
import com.hospital.backend.repository.HospitalConfigRepository;
import com.hospital.backend.service.HospitalConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class HospitalConfigServiceImpl implements HospitalConfigService {

    private final HospitalConfigRepository configRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<HospitalConfig> getCurrentConfig() {
        return configRepository.findFirstByOrderByIdAsc();
    }

    @Override
    @Transactional
    public HospitalConfig saveOrUpdate(HospitalConfig config, Long userId) {
        Optional<HospitalConfig> existing = configRepository.findFirstByOrderByIdAsc();
        
        if (existing.isPresent()) {
            HospitalConfig current = existing.get();
            config.setId(current.getId());
        }
        
        config.setUpdatedBy(userId);
        config.setUpdatedAt(LocalDateTime.now());
        
        // Valeurs par défaut si null
        if (config.getCurrencyCode() == null) config.setCurrencyCode("USD");
        if (config.getCurrencySymbol() == null) config.setCurrencySymbol("$");
        if (config.getLanguage() == null) config.setLanguage("fr");
        if (config.getPrimaryColor() == null) config.setPrimaryColor("#059669");
        if (config.getEnableLogoOnDocuments() == null) config.setEnableLogoOnDocuments(true);
        if (config.getEnableWatermark() == null) config.setEnableWatermark(false);
        if (config.getEnableSignature() == null) config.setEnableSignature(true);
        if (config.getFichePrice() == null) config.setFichePrice(new java.math.BigDecimal("5000"));
        
        HospitalConfig saved = configRepository.save(config);
        log.info("✅ Configuration hospitalière mise à jour par l'utilisateur {}", userId);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean exists() {
        return configRepository.count() > 0;
    }

    @Override
    @Transactional
    public HospitalConfig initializeDefault() {
        if (exists()) {
            return getCurrentConfig().orElseThrow();
        }
        
        HospitalConfig defaultConfig = HospitalConfig.builder()
                .hospitalName("INUA AFIA")
                .hospitalCode("HOSP-001")
                .hospitalLogoUrl(null)
                .ministryName("MINISTERE DE LA SANTE")
                .departmentName("DEPARTEMENT DE LA SANTE PUBLIQUE")
                .zoneName("ZONE RURALE DE BENI")
                .region("NORD-KIVU")
                .city("BENI")
                .country("RÉPUBLIQUE DÉMOCRATIQUE DU CONGO")
                .phoneNumber("+243 000 000 000")
                .email("contact@inuafia.com")
                .website("www.inuafia.com")
                .address("Boulevard du 30 Juin, Beni, RDC")
                .postalCode("0001")
                .taxId("TAX-000000")
                .registrationNumber("REG-000000")
                .licenseNumber("LIC-000000")
                .headerTitle("INUA AFIA")
                .headerSubtitle("Système de Gestion Hospitalière")
                .footerText("© INUA AFIA - Tous droits réservés")
                .documentWatermark(null)
                .primaryColor("#059669")
                .secondaryColor("#065f46")
                .currencyCode("USD")
                .currencySymbol("$")
                .language("fr")
                .timezone("Africa/Kinshasa")
                .dateFormat("dd/MM/yyyy")
                .enableLogoOnDocuments(true)
                .enableWatermark(false)
                .enableSignature(true)
                .fichePrice(new java.math.BigDecimal("5000"))
                .updatedAt(LocalDateTime.now())
                .build();
        
        HospitalConfig saved = configRepository.save(defaultConfig);
        log.info("✅ Configuration hospitalière par défaut créée");
        return saved;
    }
}
