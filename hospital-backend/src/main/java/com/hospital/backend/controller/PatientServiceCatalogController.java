package com.hospital.backend.controller;

import com.hospital.backend.dto.ServiceCatalogDTO;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.Examen;
import com.hospital.backend.entity.MedicalService;
import com.hospital.backend.repository.ExamenRepository;
import com.hospital.backend.repository.MedicalServiceRepository;
import com.hospital.backend.security.HospitalTenantContext;
import com.hospital.backend.service.ExchangeRateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ★ CONTROLLER POUR LE CATALOGUE DES SERVICES (PORTAIL PATIENT)
 * Permet aux patients de consulter les prestations disponibles et leurs tarifs
 */
@RestController
@RequestMapping("/api/v1/patient")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", 
                        "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class PatientServiceCatalogController {

    private final MedicalServiceRepository medicalServiceRepository;
    private final ExamenRepository examenRepository;
    private final ExchangeRateService exchangeRateService;

    /**
     * ★ Récupère le catalogue complet des services et examens actifs
     * GET /api/v1/patient/services-catalog
     */
    @GetMapping("/services-catalog")
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<ServiceCatalogDTO>> getServicesCatalog(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false, defaultValue = "USD") String currency) {
        
        log.info("📋 Récupération du catalogue des services pour les patients - Recherche: {}, Catégorie: {}, Devise: {}", 
                 search, category, currency);
        
        List<ServiceCatalogDTO> catalog = new ArrayList<>();
        
        Long hId = HospitalTenantContext.getHospitalId();
        // Récupérer les services médicaux actifs
        List<MedicalService> services = (hId != null)
                ? medicalServiceRepository.findByHospitalIdAndIsActiveTrue(hId)
                : medicalServiceRepository.findByIsActiveTrue();
        for (MedicalService service : services) {
            ServiceCatalogDTO dto = convertServiceToDTO(service, currency);
            if (matchesFilter(dto, search, category)) {
                catalog.add(dto);
            }
        }
        
        // Récupérer les examens actifs
        List<Examen> examens = (hId != null)
                ? examenRepository.findByHospitalIdAndActifTrue(hId)
                : examenRepository.findByActifTrue();
        for (Examen examen : examens) {
            ServiceCatalogDTO dto = convertExamenToDTO(examen, currency);
            if (matchesFilter(dto, search, category)) {
                catalog.add(dto);
            }
        }
        
        // Trier par nom
        catalog.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
        
        log.info("✅ {} prestations trouvées dans le catalogue", catalog.size());
        return ResponseEntity.ok(catalog);
    }

    /**
     * ★ Convertit un MedicalService en DTO de catalogue
     */
    private ServiceCatalogDTO convertServiceToDTO(MedicalService service, String targetCurrency) {
        BigDecimal price = convertPrice(
            BigDecimal.valueOf(service.getPrix()), 
            service.getCurrency() != null ? service.getCurrency().name() : "USD", 
            targetCurrency
        );
        
        return ServiceCatalogDTO.builder()
                .id(service.getId())
                .name(service.getNom())
                .code(service.getDepartement())
                .description(service.getDescription())
                .price(price)
                .currency(targetCurrency)
                .category(mapDepartmentToCategory(service.getDepartement()))
                .type("SERVICE")
                .icon(getIconForCategory(mapDepartmentToCategory(service.getDepartement())))
                .durationMinutes(service.getDuree())
                .active(service.getIsActive())
                .build();
    }

    /**
     * ★ Convertit un Examen en DTO de catalogue
     */
    private ServiceCatalogDTO convertExamenToDTO(Examen examen, String targetCurrency) {
        BigDecimal price = convertPrice(
            examen.getPrix(), 
            "USD", // Les examens sont en USD par défaut
            targetCurrency
        );
        
        return ServiceCatalogDTO.builder()
                .id(examen.getId())
                .name(examen.getNom())
                .code(examen.getCode())
                .description(examen.getDescription())
                .price(price)
                .currency(targetCurrency)
                .category(examen.getCategorie())
                .type("EXAMEN")
                .icon(getIconForCategory(examen.getCategorie()))
                .unit(examen.getUnite())
                .resultDelay(examen.getDelaiResultatHeures() != null ? 
                    examen.getDelaiResultatHeures() + "h" : null)
                .active(examen.getActif())
                .build();
    }

    /**
     * ★ Convertit le prix selon la devise demandée
     * Utilise le taux dynamique configuré par l'admin
     */
    private BigDecimal convertPrice(BigDecimal price, String fromCurrency, String toCurrency) {
        if (price == null) {
            return BigDecimal.ZERO;
        }
        
        if (fromCurrency.equalsIgnoreCase(toCurrency)) {
            return price;
        }
        
        // Récupérer le taux dynamique USD/FC depuis la base de données
        BigDecimal usdToFcRate = exchangeRateService.getUsdToFcRate();
        
        // Convertir en USD d'abord si nécessaire
        BigDecimal priceInUsd = price;
        if (fromCurrency.equals("FC")) {
            priceInUsd = price.divide(usdToFcRate, 2, RoundingMode.HALF_UP);
        }
        
        // Convertir vers la devise cible
        if (toCurrency.equals("FC")) {
            return priceInUsd.multiply(usdToFcRate).setScale(2, RoundingMode.HALF_UP);
        }
        
        return priceInUsd.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * ★ Filtre les résultats selon la recherche et la catégorie
     */
    private boolean matchesFilter(ServiceCatalogDTO dto, String search, String category) {
        // Filtre par catégorie
        if (category != null && !category.isEmpty() && !category.equals("ALL")) {
            if (dto.getCategory() == null || !dto.getCategory().equalsIgnoreCase(category)) {
                return false;
            }
        }
        
        // Filtre par recherche textuelle
        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            boolean matchesName = dto.getName() != null && 
                                  dto.getName().toLowerCase().contains(searchLower);
            boolean matchesCode = dto.getCode() != null && 
                                  dto.getCode().toLowerCase().contains(searchLower);
            boolean matchesDesc = dto.getDescription() != null && 
                                  dto.getDescription().toLowerCase().contains(searchLower);
            
            if (!matchesName && !matchesCode && !matchesDesc) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * ★ Mappe le département vers une catégorie standardisée
     */
    private String mapDepartmentToCategory(String department) {
        if (department == null) return "AUTRE";
        
        String dept = department.toUpperCase();
        if (dept.contains("URGENCE")) return "URGENCE";
        if (dept.contains("LABO") || dept.contains("LABORATOIRE")) return "LABORATOIRE";
        if (dept.contains("CONSULT") || dept.contains("MEDECIN")) return "CONSULTATION";
        if (dept.contains("IMAGERIE") || dept.contains("RADIO") || dept.contains("SCAN")) return "IMAGERIE";
        if (dept.contains("CHIRURGIE")) return "CHIRURGIE";
        if (dept.contains("HOSPITALISATION")) return "HOSPITALISATION";
        if (dept.contains("PHARMACIE")) return "PHARMACIE";
        if (dept.contains("MATERNITE")) return "MATERNITE";
        
        return department;
    }

    /**
     * ★ Retourne l'icône appropriée pour la catégorie
     */
    private String getIconForCategory(String category) {
        if (category == null) return "stethoscope";
        
        String cat = category.toUpperCase();
        if (cat.contains("URGENCE")) return "ambulance";
        if (cat.contains("LABO")) return "flask";
        if (cat.contains("CONSULT")) return "stethoscope";
        if (cat.contains("IMAGERIE")) return "scan";
        if (cat.contains("CHIRURGIE")) return "procedures";
        if (cat.contains("HOSPITALISATION")) return "bed";
        if (cat.contains("PHARMACIE")) return "pill";
        if (cat.contains("MATERNITE")) return "baby";
        
        return "stethoscope";
    }

    /**
     * ★ Récupère toutes les catégories disponibles
     * GET /api/v1/patient/services-catalog/categories
     */
    @GetMapping("/services-catalog/categories")
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<String>> getAvailableCategories() {
        log.info("📋 Récupération des catégories disponibles");
        
        List<String> categories = new ArrayList<>();
        
        Long hId = HospitalTenantContext.getHospitalId();
        // Catégories des services
        List<MedicalService> services = (hId != null)
                ? medicalServiceRepository.findByHospitalIdAndIsActiveTrue(hId)
                : medicalServiceRepository.findByIsActiveTrue();
        for (MedicalService service : services) {
            String category = mapDepartmentToCategory(service.getDepartement());
            if (!categories.contains(category)) {
                categories.add(category);
            }
        }
        
        // Catégories des examens
        List<Examen> examens = (hId != null)
                ? examenRepository.findByHospitalIdAndActifTrue(hId)
                : examenRepository.findByActifTrue();
        for (Examen examen : examens) {
            if (examen.getCategorie() != null && !categories.contains(examen.getCategorie())) {
                categories.add(examen.getCategorie());
            }
        }
        
        // Trier et retourner
        categories.sort(String::compareToIgnoreCase);
        
        return ResponseEntity.ok(categories);
    }
}
