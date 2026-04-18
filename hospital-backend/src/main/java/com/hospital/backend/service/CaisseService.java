package com.hospital.backend.service;

import com.hospital.backend.entity.Caisse;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.exception.SoldeInsuffisantException;
import com.hospital.backend.repository.CaisseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    /**
     * Liste toutes les caisses actives
     */
    public List<Caisse> getCaissesActives() {
        return caisseRepository.findByActiveTrue();
    }

    /**
     * Liste les caisses par devise
     */
    public List<Caisse> getCaissesParDevise(Currency devise) {
        return caisseRepository.findByDeviseAndActiveTrue(devise);
    }

    /**
     * Récupère une caisse par ID
     */
    public Caisse getCaisse(Long id) {
        return caisseRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Caisse non trouvée: " + id));
    }

    /**
     * Débite une caisse avec vérification de solde
     * @throws SoldeInsuffisantException si solde insuffisant
     */
    @Transactional
    public void debiterCaisse(Long caisseId, BigDecimal montant) {
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
