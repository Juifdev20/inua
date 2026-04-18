package com.hospital.backend.service;

import com.hospital.backend.entity.Caisse;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.exception.SoldeInsuffisantException;
import com.hospital.backend.repository.CaisseRepository;
import com.hospital.backend.repository.ExpenseRepository;
import com.hospital.backend.repository.RevenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Service de gestion des caisses
 * Gère les opérations de débit/crédit avec validation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CaisseService {

    private final CaisseRepository caisseRepository;
    private final RevenueRepository revenueRepository;
    private final ExpenseRepository expenseRepository;

    /**
     * Liste toutes les caisses actives avec caisse centrale virtuelle
     * ET synchronise les soldes des caisses physiques
     */
    public List<Caisse> getCaissesActives() {
        List<Caisse> caisses = new ArrayList<>(caisseRepository.findByActiveTrue());
        
        // Calculer les soldes globaux
        BigDecimal soldeCentralCDF = calculerSoldeGlobal(Currency.CDF);
        BigDecimal soldeCentralUSD = calculerSoldeGlobal(Currency.USD);
        
        // Synchroniser les soldes des caisses physiques avec le solde calculé
        for (Caisse caisse : caisses) {
            if (caisse.getDevise() == Currency.CDF && soldeCentralCDF.compareTo(BigDecimal.ZERO) > 0) {
                caisse.setSolde(soldeCentralCDF);
                log.info("🔄 Solde Caisse CDF '{}' synchronisé: {} CDF", caisse.getNom(), soldeCentralCDF);
            }
            if (caisse.getDevise() == Currency.USD && soldeCentralUSD.compareTo(BigDecimal.ZERO) > 0) {
                caisse.setSolde(soldeCentralUSD);
                log.info("🔄 Solde Caisse USD '{}' synchronisé: {} USD", caisse.getNom(), soldeCentralUSD);
            }
        }
        
        // Ajouter la Trésorerie Globale virtuelle pour CDF (Admin/Finance uniquement)
        if (soldeCentralCDF.compareTo(BigDecimal.ZERO) != 0) {
            Caisse caisseCentralCDF = Caisse.builder()
                .id(-1L)
                .nom("Trésorerie Globale CDF")
                .description("Trésorerie centralisée - Réservée Admin/Finance (Fournisseurs, Salaires)")
                .devise(Currency.CDF)
                .solde(soldeCentralCDF)
                .soldeInitial(BigDecimal.ZERO)
                .active(true)
                .build();
            caisses.add(0, caisseCentralCDF);
        }
        
        // Ajouter la Trésorerie Globale virtuelle pour USD
        if (soldeCentralUSD.compareTo(BigDecimal.ZERO) != 0) {
            Caisse caisseCentralUSD = Caisse.builder()
                .id(-2L)
                .nom("Trésorerie Globale USD")
                .description("Trésorerie centralisée - Réservée Admin/Finance (Fournisseurs, Salaires)")
                .devise(Currency.USD)
                .solde(soldeCentralUSD)
                .soldeInitial(BigDecimal.ZERO)
                .active(true)
                .build();
            caisses.add(1, caisseCentralUSD);
        }
        
        return caisses;
    }
    
    /**
     * Calcule le solde global (Revenus - Dépenses) pour une devise
     */
    public BigDecimal calculerSoldeGlobal(Currency devise) {
        BigDecimal totalRevenus = revenueRepository.getTotalByCurrency(devise);
        BigDecimal totalDepenses = expenseRepository.getTotalByCurrency(devise);
        
        BigDecimal solde = totalRevenus.subtract(totalDepenses);
        log.info("💰 Solde global {}: {} (Revenus: {}, Dépenses: {})", 
            devise, solde, totalRevenus, totalDepenses);
        
        return solde;
    }

    /**
     * Liste les caisses par devise avec caisse centrale virtuelle
     * ET synchronise les soldes des caisses physiques
     */
    public List<Caisse> getCaissesParDevise(Currency devise) {
        List<Caisse> caisses = new ArrayList<>(caisseRepository.findByDeviseAndActiveTrue(devise));
        
        // Calculer et synchroniser le solde
        BigDecimal soldeGlobal = calculerSoldeGlobal(devise);
        
        // Mettre à jour les soldes des caisses physiques
        for (Caisse caisse : caisses) {
            if (soldeGlobal.compareTo(BigDecimal.ZERO) > 0) {
                caisse.setSolde(soldeGlobal);
                log.info("🔄 Solde Caisse {} '{}' synchronisé: {}", devise, caisse.getNom(), soldeGlobal);
            }
        }
        
        Long idVirtuel = devise == Currency.CDF ? -1L : -2L;
        
        Caisse caisseCentral = Caisse.builder()
            .id(idVirtuel)
            .nom("Trésorerie Globale " + devise)
            .description("Trésorerie centralisée - Réservée Admin/Finance")
            .devise(devise)
            .solde(soldeGlobal)
            .soldeInitial(BigDecimal.ZERO)
            .active(true)
            .build();
        caisses.add(0, caisseCentral);
        
        return caisses;
    }

    /**
     * Récupère une caisse par ID (y compris les caisses virtuelles)
     */
    public Caisse getCaisse(Long id) {
        // Gérer les caisses virtuelles (ID négatif)
        if (id < 0) {
            Currency devise = id == -1 ? Currency.CDF : Currency.USD;
            BigDecimal soldeGlobal = calculerSoldeGlobal(devise);
            
            return Caisse.builder()
                .id(id)
                .nom("Caisse Centrale " + devise)
                .description("Solde global calculé (Revenus - Dépenses)")
                .devise(devise)
                .solde(soldeGlobal)
                .soldeInitial(BigDecimal.ZERO)
                .active(true)
                .build();
        }
        
        return caisseRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Caisse non trouvée: " + id));
    }

    /**
     * Débite une caisse avec vérification de solde
     * @throws SoldeInsuffisantException si solde insuffisant
     */
    @Transactional
    public void debiterCaisse(Long caisseId, BigDecimal montant) {
        // Gérer les caisses virtuelles (ID négatif = caisse centrale calculée)
        if (caisseId < 0) {
            Currency devise = caisseId == -1 ? Currency.CDF : Currency.USD;
            BigDecimal soldeGlobal = calculerSoldeGlobal(devise);
            
            if (soldeGlobal.compareTo(montant) < 0) {
                throw new SoldeInsuffisantException("Caisse Centrale " + devise, soldeGlobal, montant);
            }
            
            log.info("💰 Caisse Centrale {} débitée de {} (solde global restant: {})",
                devise, montant, soldeGlobal.subtract(montant));
            return; // Pas de persistance pour la caisse virtuelle
        }
        
        Caisse caisse = getCaisse(caisseId);

        if (!caisse.hasSufficientFunds(montant)) {
            throw new SoldeInsuffisantException(caisse.getNom(), caisse.getSolde(), montant);
        }

        caisse.debiter(montant);
        caisseRepository.save(caisse);

        log.info("💰 Caisse '{}' débitée de {} {} (nouveau solde: {})",
            caisse.getNom(), montant, caisse.getDevise(), caisse.getSolde());
    }

    /**
     * Crédite une caisse
     */
    @Transactional
    public void crediterCaisse(Long caisseId, BigDecimal montant) {
        Caisse caisse = getCaisse(caisseId);
        caisse.crediter(montant);
        caisseRepository.save(caisse);

        log.info("💰 Caisse '{}' créditée de {} {} (nouveau solde: {})",
            caisse.getNom(), montant, caisse.getDevise(), caisse.getSolde());
    }

    /**
     * Transfert de fonds entre deux caisses (même devise)
     */
    @Transactional
    public void transfererFonds(Long caisseSourceId, Long caisseDestId, BigDecimal montant) {
        Caisse source = getCaisse(caisseSourceId);
        Caisse destination = getCaisse(caisseDestId);

        if (source.getDevise() != destination.getDevise()) {
            throw new IllegalArgumentException(
                "Transfert impossible: devises différentes (" + source.getDevise() + " → " + destination.getDevise() + ")");
        }

        if (!source.hasSufficientFunds(montant)) {
            throw new SoldeInsuffisantException(source.getNom(), source.getSolde(), montant);
        }

        source.debiter(montant);
        destination.crediter(montant);

        caisseRepository.save(source);
        caisseRepository.save(destination);

        log.info("💰 Transfert {} {} de '{}' → '{}'",
            montant, source.getDevise(), source.getNom(), destination.getNom());
    }

    /**
     * Crée une nouvelle caisse
     */
    @Transactional
    public Caisse creerCaisse(String nom, String description, Currency devise, BigDecimal soldeInitial) {
        if (caisseRepository.existsByNom(nom)) {
            throw new IllegalArgumentException("Une caisse avec ce nom existe déjà: " + nom);
        }

        Caisse caisse = Caisse.builder()
            .nom(nom)
            .description(description)
            .devise(devise)
            .solde(soldeInitial != null ? soldeInitial : BigDecimal.ZERO)
            .soldeInitial(soldeInitial != null ? soldeInitial : BigDecimal.ZERO)
            .active(true)
            .build();

        return caisseRepository.save(caisse);
    }

    /**
     * Désactive une caisse (soft delete)
     */
    @Transactional
    public void desactiverCaisse(Long caisseId) {
        Caisse caisse = getCaisse(caisseId);
        caisse.setActive(false);
        caisseRepository.save(caisse);
        log.info("🚫 Caisse '{}' désactivée", caisse.getNom());
    }
}
