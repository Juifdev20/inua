package com.hospital.backend.service;

import com.hospital.backend.dto.LivreCaisseDTO;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.repository.LivreCaisseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Service pour la gestion du Livre de Caisse
 * Calcule les soldes cumulatifs et génère les vues Synthèse et Détaillée
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LivreCaisseService {

    private final LivreCaisseRepository livreCaisseRepository;

    private static final DateTimeFormatter HEURE_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Génère la vue Synthétique (totaux par jour)
     */
    @Transactional(readOnly = true)
    public LivreCaisseDTO.SyntheseResponse getSynthese(LocalDate dateDebut, LocalDate dateFin) {
        log.info("📊 Génération du Livre de Caisse - Synthèse du {} au {}", dateDebut, dateFin);

        try {
            // 1. Calculer les soldes d'ouverture
            log.debug("Calcul solde ouverture USD...");
            BigDecimal soldeOuvertureUSD = livreCaisseRepository.calculateSoldeOuverture(dateDebut, Currency.USD.name());
            log.debug("Calcul solde ouverture CDF...");
            BigDecimal soldeOuvertureCDF = livreCaisseRepository.calculateSoldeOuverture(dateDebut, Currency.CDF.name());

        if (soldeOuvertureUSD == null) soldeOuvertureUSD = BigDecimal.ZERO;
        if (soldeOuvertureCDF == null) soldeOuvertureCDF = BigDecimal.ZERO;

        log.info("💰 Solde d'ouverture - USD: {}, CDF: {}", soldeOuvertureUSD, soldeOuvertureCDF);

        // 2. Récupérer les totaux journaliers
        List<Object[]> rawData = livreCaisseRepository.findSyntheseJournaliere(dateDebut, dateFin);
        List<LivreCaisseDTO.SyntheseJournaliere> journal = new ArrayList<>();

        BigDecimal soldeCumulatifUSD = soldeOuvertureUSD;
        BigDecimal soldeCumulatifCDF = soldeOuvertureCDF;

        BigDecimal totalEntreesUSD = BigDecimal.ZERO;
        BigDecimal totalSortiesUSD = BigDecimal.ZERO;
        BigDecimal totalEntreesCDF = BigDecimal.ZERO;
        BigDecimal totalSortiesCDF = BigDecimal.ZERO;

        for (Object[] row : rawData) {
            java.sql.Date sqlDate = (java.sql.Date) row[0];
            LocalDate date = sqlDate.toLocalDate();
            
            BigDecimal entreeUSD = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            BigDecimal sortieUSD = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            BigDecimal entreeCDF = row[3] != null ? (BigDecimal) row[3] : BigDecimal.ZERO;
            BigDecimal sortieCDF = row[4] != null ? (BigDecimal) row[4] : BigDecimal.ZERO;
            Number nbTrans = row[5] != null ? (Number) row[5] : 0;

            // Calculer les soldes cumulatifs
            soldeCumulatifUSD = soldeCumulatifUSD.add(entreeUSD).subtract(sortieUSD);
            soldeCumulatifCDF = soldeCumulatifCDF.add(entreeCDF).subtract(sortieCDF);

            // Cumuler les totaux
            totalEntreesUSD = totalEntreesUSD.add(entreeUSD);
            totalSortiesUSD = totalSortiesUSD.add(sortieUSD);
            totalEntreesCDF = totalEntreesCDF.add(entreeCDF);
            totalSortiesCDF = totalSortiesCDF.add(sortieCDF);

            journal.add(LivreCaisseDTO.SyntheseJournaliere.builder()
                    .date(date)
                    .entreeUSD(entreeUSD)
                    .sortieUSD(sortieUSD)
                    .soldeUSD(soldeCumulatifUSD)
                    .entreeCDF(entreeCDF)
                    .sortieCDF(sortieCDF)
                    .soldeCDF(soldeCumulatifCDF)
                    .nombreTransactions(nbTrans.intValue())
                    .build());
        }

        // 3. Créer les totaux de période
        LivreCaisseDTO.TotauxPeriode totaux = LivreCaisseDTO.TotauxPeriode.builder()
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .totalEntreesUSD(totalEntreesUSD)
                .totalSortiesUSD(totalSortiesUSD)
                .soldeFinalUSD(soldeCumulatifUSD)
                .totalEntreesCDF(totalEntreesCDF)
                .totalSortiesCDF(totalSortiesCDF)
                .soldeFinalCDF(soldeCumulatifCDF)
                .build();

        log.info("✅ Synthèse générée: {} jours, Solde final USD: {}, CDF: {}",
                journal.size(), soldeCumulatifUSD, soldeCumulatifCDF);

        return LivreCaisseDTO.SyntheseResponse.builder()
                .journal(journal)
                .totaux(totaux)
                .soldeOuvertureUSD(soldeOuvertureUSD)
                .soldeOuvertureCDF(soldeOuvertureCDF)
                .build();
        } catch (Exception e) {
            log.error("❌ Erreur SQL dans getSynthese: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur base de données: " + e.getMessage(), e);
        }
    }

    /**
     * Génère la vue Détaillée (transaction par transaction)
     */
    @Transactional(readOnly = true)
    public LivreCaisseDTO.DetailsResponse getDetails(LocalDate dateDebut, LocalDate dateFin, Pageable pageable) {
        log.info("📋 Génération du Livre de Caisse - Détails du {} au {} (page: {}, size: {})",
                dateDebut, dateFin, pageable.getPageNumber(), pageable.getPageSize());

        // 1. Calculer les soldes d'ouverture
        BigDecimal soldeCumulatifUSD = livreCaisseRepository.calculateSoldeOuverture(dateDebut, Currency.USD.name());
        BigDecimal soldeCumulatifCDF = livreCaisseRepository.calculateSoldeOuverture(dateDebut, Currency.CDF.name());

        if (soldeCumulatifUSD == null) soldeCumulatifUSD = BigDecimal.ZERO;
        if (soldeCumulatifCDF == null) soldeCumulatifCDF = BigDecimal.ZERO;

        // 2. Récupérer toutes les transactions (pour calculer les soldes cumulatifs)
        // Note: On récupère tout pour calculer correctement le solde, même si on pagine l'affichage
        List<Object[]> allTransactions = livreCaisseRepository.findTransactionsByPeriode(dateDebut, dateFin, Pageable.unpaged()).getContent();

        List<LivreCaisseDTO.DetailTransaction> transactions = new ArrayList<>();

        BigDecimal totalEntreesUSD = BigDecimal.ZERO;
        BigDecimal totalSortiesUSD = BigDecimal.ZERO;
        BigDecimal totalEntreesCDF = BigDecimal.ZERO;
        BigDecimal totalSortiesCDF = BigDecimal.ZERO;

        for (Object[] row : allTransactions) {
            LivreCaisseDTO.DetailTransaction trans = mapToDetailTransaction(row);

            // Calculer le solde cumulatif
            BigDecimal montant = trans.getMontant() != null ? trans.getMontant() : BigDecimal.ZERO;
            
            if ("USD".equals(trans.getDevise())) {
                if ("ENTREE".equals(trans.getType())) {
                    soldeCumulatifUSD = soldeCumulatifUSD.add(montant);
                    totalEntreesUSD = totalEntreesUSD.add(montant);
                } else {
                    soldeCumulatifUSD = soldeCumulatifUSD.subtract(montant);
                    totalSortiesUSD = totalSortiesUSD.add(montant);
                }
                trans.setSoldeApres(soldeCumulatifUSD);
            } else { // CDF
                if ("ENTREE".equals(trans.getType())) {
                    soldeCumulatifCDF = soldeCumulatifCDF.add(montant);
                    totalEntreesCDF = totalEntreesCDF.add(montant);
                } else {
                    soldeCumulatifCDF = soldeCumulatifCDF.subtract(montant);
                    totalSortiesCDF = totalSortiesCDF.add(montant);
                }
                trans.setSoldeApres(soldeCumulatifCDF);
            }

            transactions.add(trans);
        }

        // 3. Paginer les résultats manuellement
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), transactions.size());
        List<LivreCaisseDTO.DetailTransaction> paginatedList = 
                start < transactions.size() ? transactions.subList(start, end) : new ArrayList<>();

        // 4. Calculer le solde final
        BigDecimal soldeFinalUSD = soldeCumulatifUSD;
        BigDecimal soldeFinalCDF = soldeCumulatifCDF;

        LivreCaisseDTO.TotauxPeriode totaux = LivreCaisseDTO.TotauxPeriode.builder()
                .dateDebut(dateDebut)
                .dateFin(dateFin)
                .totalEntreesUSD(totalEntreesUSD)
                .totalSortiesUSD(totalSortiesUSD)
                .soldeFinalUSD(soldeFinalUSD)
                .totalEntreesCDF(totalEntreesCDF)
                .totalSortiesCDF(totalSortiesCDF)
                .soldeFinalCDF(soldeFinalCDF)
                .build();

        log.info("✅ Détails générés: {} transactions totales, affichage page {}/{} ({} éléments)",
                transactions.size(), pageable.getPageNumber() + 1,
                (int) Math.ceil((double) transactions.size() / pageable.getPageSize()),
                paginatedList.size());

        return LivreCaisseDTO.DetailsResponse.builder()
                .transactions(paginatedList)
                .totaux(totaux)
                .page(pageable.getPageNumber())
                .size(pageable.getPageSize())
                .totalElements(transactions.size())
                .build();
    }

    /**
     * Récupère les détails filtrés par caissier (pour clôture de caisse individuelle)
     */
    @Transactional(readOnly = true)
    public List<LivreCaisseDTO.DetailTransaction> getDetailsByCaissier(
            LocalDate dateDebut, LocalDate dateFin, Long caissierId) {
        log.info("👤 Filtre par caissier ID: {} du {} au {}", caissierId, dateDebut, dateFin);

        List<Object[]> rawData = livreCaisseRepository.findTransactionsByPeriodeAndCaissier(
                dateDebut, dateFin, caissierId);

        List<LivreCaisseDTO.DetailTransaction> transactions = new ArrayList<>();

        for (Object[] row : rawData) {
            transactions.add(mapToDetailTransaction(row));
        }

        return transactions;
    }

    /**
     * Mapping d'une ligne de résultat SQL vers DetailTransaction DTO
     */
    private LivreCaisseDTO.DetailTransaction mapToDetailTransaction(Object[] row) {
        // Mapping des colonnes selon la requête SQL
        // 0: id, 1: date, 2: type, 3: description, 4: document, 5: devise, 6: montant
        // 7: patient_nom, 8: patient_prenom, 9: patient_code
        // 10: caissier_id, 11: caissier_nom, 12: medecin_nom, 13: source

        Number id = (Number) row[0];
        Timestamp dateTs = (Timestamp) row[1];
        String type = (String) row[2];
        String description = (String) row[3];
        String document = (String) row[4];
        String devise = (String) row[5];
        BigDecimal montant = row[6] != null ? (BigDecimal) row[6] : BigDecimal.ZERO;
        String patientNom = (String) row[7];
        String patientPrenom = (String) row[8];
        String patientCode = (String) row[9];
        Number caissierId = (Number) row[10];
        String caissierNom = (String) row[11];
        String medecinNom = (String) row[12];
        String source = (String) row[13];

        return LivreCaisseDTO.DetailTransaction.builder()
                .id(id != null ? id.longValue() : null)
                .date(dateTs != null ? dateTs.toLocalDateTime() : null)
                .heure(dateTs != null ? dateTs.toLocalDateTime().format(HEURE_FORMATTER) : "")
                .type(type)
                .description(description)
                .document(document)
                .devise(devise)
                .montant(montant)
                .patientNom(patientNom)
                .patientPrenom(patientPrenom)
                .patientCode(patientCode)
                .caissierId(caissierId != null ? caissierId.longValue() : null)
                .caissierNom(caissierNom)
                .medecinNom(medecinNom)
                .source(source)
                .build();
    }
}
