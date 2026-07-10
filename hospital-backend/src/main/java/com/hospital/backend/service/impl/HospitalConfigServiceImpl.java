package com.hospital.backend.service.impl;

import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.entity.HospitalConfig;
import com.hospital.backend.repository.HospitalConfigRepository;
import com.hospital.backend.repository.HospitalRepository;
import com.hospital.backend.security.HospitalTenantContext;
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
    private final HospitalRepository hospitalRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<HospitalConfig> getCurrentConfig() {
        Long hId = HospitalTenantContext.getHospitalId();
        if (hId != null) {
            // En multi-tenant, NE JAMAIS retourner une config sans hospital_id
            return configRepository.findByHospitalId(hId);
        }
        // Fallback pour super admin ou tests (sans contexte d'hôpital)
        return configRepository.findFirstByOrderByIdAsc();
    }

    @Override
    @Transactional
    public HospitalConfig saveOrUpdate(HospitalConfig config, Long userId) {
        Long hId = HospitalTenantContext.getHospitalId();
        Optional<HospitalConfig> existing = (hId != null)
                ? configRepository.findByHospitalId(hId)
                : configRepository.findFirstByOrderByIdAsc();
        
        if (existing.isPresent()) {
            HospitalConfig current = existing.get();
            config.setId(current.getId());
        }
        // Assigner l'hôpital au moment de la sauvegarde
        if (hId != null) {
            config.setHospital(Hospital.builder().id(hId).build());
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
        if (config.getFichePrice() == null) config.setFichePrice(new java.math.BigDecimal("3")); // 3 USD par défaut
        if (config.getFichePriceCurrency() == null) config.setFichePriceCurrency(Currency.USD);
        
        HospitalConfig saved = configRepository.save(config);
        log.info("✅ Configuration hospitalière mise à jour par l'utilisateur {}", userId);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean exists() {
        try {
            Long hId = HospitalTenantContext.getHospitalId();
            if (hId != null) {
                return configRepository.existsByHospitalId(hId);
            }
            return configRepository.count() > 0;
        } catch (Exception e) {
            log.warn("⚠️ Table hospital_config inaccessible (premier démarrage): {}", e.getMessage());
            return false;
        }
    }

    @Override
    @Transactional
    public HospitalConfig initializeDefault() {
        try {
            if (exists()) {
                return getCurrentConfig().orElseThrow();
            }
        } catch (Exception e) {
            log.warn("⚠️ Impossible de vérifier hospital_config, création ignorée pour le moment");
            return null;
        }

        Long hId = HospitalTenantContext.getHospitalId();
        // 🏥 MULTI-TENANT : nom/code tirés de l'hôpital réel pour garantir l'UNICITÉ de
        // hospital_code (contrainte unique globale) — sinon 2 hôpitaux → doublon → 23505.
        Hospital hospital = hId != null ? hospitalRepository.findById(hId).orElse(null) : null;
        String uniqueCode = (hospital != null && hospital.getCode() != null)
                ? "CFG-" + hospital.getCode()
                : "CFG-" + (hId != null ? hId : "DEFAULT-" + System.currentTimeMillis());
        String hospitalName = (hospital != null && hospital.getNom() != null) ? hospital.getNom() : "INUA AFYA";
        HospitalConfig defaultConfig = HospitalConfig.builder()
                .hospital(hId != null ? Hospital.builder().id(hId).build() : null)
                .hospitalName(hospitalName)
                .hospitalCode(uniqueCode)
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
                .headerTitle("INUA AFYA")
                .headerSubtitle("Système de Gestion Hospitalière")
                .footerText("© INUA AFYA - Tous droits réservés")
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
                .fichePrice(new java.math.BigDecimal("3")) // 3 USD par défaut
                .fichePriceCurrency(Currency.USD)
                .updatedAt(LocalDateTime.now())
                .build();
        
        try {
            HospitalConfig saved = configRepository.save(defaultConfig);
            log.info("✅ Configuration hospitalière par défaut créée");
            return saved;
        } catch (Exception e) {
            log.warn("⚠️ Impossible de créer hospital_config (table inexistante): {}", e.getMessage());
            return null;
        }
    }
}
