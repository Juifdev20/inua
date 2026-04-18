package com.hospital.backend.service;

import com.hospital.backend.dto.LivreCaisseDTO;
import com.hospital.backend.entity.HospitalConfig;
import com.hospital.backend.model.AppConfig;
import com.hospital.backend.repository.AppConfigRepository;
import com.hospital.backend.repository.LivreCaisseRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Image;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Service pour l'export Excel et PDF du Livre de Caisse
 * Génère 2 onglets: LIVRE DE CAISSE (synthèse) et DETAILS TRANSACTIONS
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LivreCaisseExportService {

    private final LivreCaisseService livreCaisseService;
    private final LivreCaisseRepository livreCaisseRepository;
    private final HospitalConfigService hospitalConfigService;
    private final AppConfigRepository appConfigRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_FORMATTER_LONG = DateTimeFormatter.ofPattern("EEEE dd/MM/yyyy", java.util.Locale.FRENCH);

    // Couleurs Excel
    private static final short COLOR_GREEN = IndexedColors.GREEN.getIndex();
    private static final short COLOR_RED = IndexedColors.RED.getIndex();
    private static final short COLOR_BLUE = IndexedColors.BLUE.getIndex();
    private static final short COLOR_YELLOW = IndexedColors.YELLOW.getIndex();
    private static final short COLOR_WHITE = IndexedColors.WHITE.getIndex();

    /**
     * Export Excel avec 2 onglets
     */
    public byte[] exportExcel(LocalDate dateDebut, LocalDate dateFin, Long caissierId) {
        log.info("📊 Génération Excel du Livre de Caisse du {} au {}", dateDebut, dateFin);

        // Récupérer la configuration de l'hôpital
        Optional<HospitalConfig> configOpt = hospitalConfigService.getCurrentConfig();
        HospitalConfig config = configOpt.orElseGet(() -> createDefaultConfig());

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            // Récupérer les données
            LivreCaisseDTO.SyntheseResponse synthese = livreCaisseService.getSynthese(dateDebut, dateFin);

            // Onglet 1: LIVRE DE CAISSE (Synthèse) - avec en-tête personnalisé
            createSyntheseSheet(workbook, synthese, dateDebut, dateFin, config);

            // Onglet 2: DETAILS TRANSACTIONS
            createDetailsSheet(workbook, dateDebut, dateFin, caissierId);

            workbook.write(outputStream);
            log.info("✅ Excel généré avec succès ({} bytes)", outputStream.size());
            return outputStream.toByteArray();

        } catch (Exception e) {
            log.error("❌ Erreur génération Excel: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la génération Excel", e);
        }
    }

    /**
     * Export PDF
     */
    public byte[] exportPDF(LocalDate dateDebut, LocalDate dateFin, Long caissierId) {
        log.info("📄 Génération PDF du Livre de Caisse du {} au {}", dateDebut, dateFin);

        // Récupérer la configuration de l'hôpital
        Optional<HospitalConfig> configOpt = hospitalConfigService.getCurrentConfig();
        HospitalConfig config = configOpt.orElseGet(() -> createDefaultConfig());

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // En-tête avec informations de l'hôpital
            createPDFHeader(document, config);

            // Titre du document
            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD, new Color(0, 100, 0));
            Paragraph title = new Paragraph("LIVRE DE CAISSE", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingBefore(10);
            title.setSpacingAfter(5);
            document.add(title);

            // Période
            Font periodFont = new Font(Font.HELVETICA, 11, Font.NORMAL);
            Paragraph period = new Paragraph("Période: " + dateDebut.format(DATE_FORMATTER) + " au " + dateFin.format(DATE_FORMATTER), periodFont);
            period.setAlignment(Element.ALIGN_CENTER);
            period.setSpacingAfter(15);
            document.add(period);

            // Récupérer les données
            LivreCaisseDTO.SyntheseResponse synthese = livreCaisseService.getSynthese(dateDebut, dateFin);

            // Tableau Synthèse
            createPDFSyntheseTable(document, synthese);

            document.add(new Paragraph("\n\n"));

            // Tableau Détails
            createPDFDetailsTable(document, dateDebut, dateFin, caissierId);

            document.close();
            log.info("✅ PDF généré avec succès ({} bytes)", outputStream.size());
            return outputStream.toByteArray();

        } catch (Exception e) {
            log.error("❌ Erreur génération PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la génération PDF", e);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXCEL - Onglet 1: LIVRE DE CAISSE (Synthèse)
    // ═════════════════════════════════════════════════════════════════════════
    private void createSyntheseSheet(Workbook workbook, LivreCaisseDTO.SyntheseResponse synthese, LocalDate dateDebut, LocalDate dateFin, HospitalConfig config) {
        Sheet sheet = workbook.createSheet("LIVRE DE CAISSE");

        // Styles
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle titleStyle = createTitleStyle(workbook);
        CellStyle dataStyle = createDataStyle(workbook);
        CellStyle currencyStyle = createCurrencyStyle(workbook);
        CellStyle totalStyle = createTotalStyle(workbook);
        CellStyle greenStyle = createColoredStyle(workbook, COLOR_GREEN, COLOR_WHITE);
        CellStyle redStyle = createColoredStyle(workbook, COLOR_RED, COLOR_WHITE);
        CellStyle blueStyle = createColoredStyle(workbook, COLOR_BLUE, COLOR_WHITE);

        // En-tête avec informations de l'hôpital
        Row hospitalRow = sheet.createRow(0);
        Cell hospitalCell = hospitalRow.createCell(0);
        hospitalCell.setCellValue(config.getHospitalName());
        hospitalCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 7));

        // Sous-titre si présent
        if (config.getHeaderSubtitle() != null && !config.getHeaderSubtitle().isEmpty()) {
            Row subtitleRow = sheet.createRow(1);
            Cell subtitleCell = subtitleRow.createCell(0);
            subtitleCell.setCellValue(config.getHeaderSubtitle());
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 7));
        }

        // Titre du document
        int titleRowNum = (config.getHeaderSubtitle() != null && !config.getHeaderSubtitle().isEmpty()) ? 2 : 1;
        Row titleRow = sheet.createRow(titleRowNum);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("LIVRE DE CAISSE");
        CellStyle documentTitleStyle = createTitleStyle(workbook);
        org.apache.poi.ss.usermodel.Font docTitleFont = workbook.createFont();
        docTitleFont.setBold(true);
        docTitleFont.setFontHeightInPoints((short) 14);
        docTitleFont.setColor(IndexedColors.DARK_GREEN.getIndex());
        documentTitleStyle.setFont(docTitleFont);
        titleCell.setCellStyle(documentTitleStyle);
        sheet.addMergedRegion(new CellRangeAddress(titleRowNum, titleRowNum, 0, 7));

        // Période
        Row periodRow = sheet.createRow(titleRowNum + 1);
        Cell periodCell = periodRow.createCell(0);
        periodCell.setCellValue("Période: " + dateDebut.format(DATE_FORMATTER) + " au " + dateFin.format(DATE_FORMATTER));
        sheet.addMergedRegion(new CellRangeAddress(titleRowNum + 1, titleRowNum + 1, 0, 7));

        // Calculer la ligne de départ des en-têtes de colonnes
        int headerRowNum = titleRowNum + 3;
        
        // En-têtes de colonnes
        Row headerRow = sheet.createRow(headerRowNum);
        String[] headers = {"DATE", "TYPE TRANSACTION", "DEVISE", "ENTRÉE", "SORTIE", "SOLDE"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Données commencent après les en-têtes
        int rowNum = headerRowNum + 1;
        String currentMonth = "";
        int year = dateDebut.getYear();

        for (LivreCaisseDTO.SyntheseJournaliere jour : synthese.getJournal()) {
            String month = jour.getDate().format(java.time.format.DateTimeFormatter.ofPattern("MMMM", java.util.Locale.FRENCH));

            // Nouveau mois
            if (!month.equals(currentMonth)) {
                currentMonth = month;
                Row monthRow = sheet.createRow(rowNum++);
                Cell monthCell = monthRow.createCell(0);
                monthCell.setCellValue(year + " - " + month.toUpperCase());
                monthCell.setCellStyle(blueStyle);
                sheet.addMergedRegion(new CellRangeAddress(rowNum - 1, rowNum - 1, 0, 5));
            }

            // USD Entrée
            if (jour.getEntreeUSD().compareTo(BigDecimal.ZERO) > 0) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(jour.getDate().format(DATE_FORMATTER_LONG));
                row.getCell(0).setCellStyle(dataStyle);
                row.createCell(1).setCellValue("Paiement (Entrée)");
                row.getCell(1).setCellStyle(greenStyle);
                row.createCell(2).setCellValue("USD");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue(jour.getEntreeUSD().doubleValue());
                row.getCell(3).setCellStyle(currencyStyle);
                row.createCell(4).setCellValue("-");
                row.getCell(4).setCellStyle(dataStyle);
                row.createCell(5).setCellValue(jour.getSoldeUSD().doubleValue());
                row.getCell(5).setCellStyle(currencyStyle);
            }

            // USD Sortie
            if (jour.getSortieUSD().compareTo(BigDecimal.ZERO) > 0) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(jour.getDate().format(DATE_FORMATTER_LONG));
                row.getCell(0).setCellStyle(dataStyle);
                row.createCell(1).setCellValue("Dépense (Sortie)");
                row.getCell(1).setCellStyle(redStyle);
                row.createCell(2).setCellValue("USD");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue("-");
                row.getCell(3).setCellStyle(dataStyle);
                row.createCell(4).setCellValue(jour.getSortieUSD().doubleValue());
                row.getCell(4).setCellStyle(currencyStyle);
                row.createCell(5).setCellValue(jour.getSoldeUSD().doubleValue());
                row.getCell(5).setCellStyle(currencyStyle);
            }

            // CDF Entrée
            if (jour.getEntreeCDF().compareTo(BigDecimal.ZERO) > 0) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(jour.getDate().format(DATE_FORMATTER_LONG));
                row.getCell(0).setCellStyle(dataStyle);
                row.createCell(1).setCellValue("Paiement (Entrée)");
                row.getCell(1).setCellStyle(greenStyle);
                row.createCell(2).setCellValue("CDF");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue(jour.getEntreeCDF().doubleValue());
                row.getCell(3).setCellStyle(currencyStyle);
                row.createCell(4).setCellValue("-");
                row.getCell(4).setCellStyle(dataStyle);
                row.createCell(5).setCellValue(jour.getSoldeCDF().doubleValue());
                row.getCell(5).setCellStyle(currencyStyle);
            }

            // CDF Sortie
            if (jour.getSortieCDF().compareTo(BigDecimal.ZERO) > 0) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(jour.getDate().format(DATE_FORMATTER_LONG));
                row.getCell(0).setCellStyle(dataStyle);
                row.createCell(1).setCellValue("Dépense (Sortie)");
                row.getCell(1).setCellStyle(redStyle);
                row.createCell(2).setCellValue("CDF");
                row.getCell(2).setCellStyle(dataStyle);
                row.createCell(3).setCellValue("-");
                row.getCell(3).setCellStyle(dataStyle);
                row.createCell(4).setCellValue(jour.getSortieCDF().doubleValue());
                row.getCell(4).setCellStyle(currencyStyle);
                row.createCell(5).setCellValue(jour.getSoldeCDF().doubleValue());
                row.getCell(5).setCellStyle(currencyStyle);
            }
        }

        // Totaux
        Row totalRow = sheet.createRow(rowNum++);
        totalRow.createCell(0).setCellValue("TOTAL");
        totalRow.getCell(0).setCellStyle(totalStyle);
        sheet.addMergedRegion(new CellRangeAddress(rowNum - 1, rowNum - 1, 0, 1));

        // Largeurs de colonnes
        sheet.setColumnWidth(0, 30);
        sheet.setColumnWidth(1, 25);
        sheet.setColumnWidth(2, 12);
        sheet.setColumnWidth(3, 15);
        sheet.setColumnWidth(4, 15);
        sheet.setColumnWidth(5, 15);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXCEL - Onglet 2: DETAILS TRANSACTIONS
    // ═════════════════════════════════════════════════════════════════════════
    private void createDetailsSheet(Workbook workbook, LocalDate dateDebut, LocalDate dateFin, Long caissierId) {
        Sheet sheet = workbook.createSheet("DETAILS TRANSACTIONS");

        // Styles
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle dataStyle = createDataStyle(workbook);
        CellStyle currencyStyle = createCurrencyStyle(workbook);
        CellStyle greenStyle = createColoredStyle(workbook, COLOR_GREEN, COLOR_WHITE);
        CellStyle redStyle = createColoredStyle(workbook, COLOR_RED, COLOR_WHITE);

        // En-têtes
        Row headerRow = sheet.createRow(0);
        String[] headers = {"ANNÉE", "MOIS", "DATE", "TYPE TRANSACTION", "DESCRIPTION", "DEVISE", "MONTANT", "PATIENT/FOURNISSEUR", "DOCUMENT"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Récupérer les détails
        List<Object[]> details;
        if (caissierId != null) {
            details = livreCaisseRepository.findTransactionsByPeriodeAndCaissier(dateDebut, dateFin, caissierId);
        } else {
            details = livreCaisseRepository.findTransactionsByPeriode(dateDebut, dateFin, org.springframework.data.domain.Pageable.unpaged()).getContent();
        }

        // Données
        int rowNum = 1;
        String currentYear = "";
        String currentMonth = "";
        String currentDate = "";

        for (Object[] row : details) {
            java.sql.Timestamp dateTs = (java.sql.Timestamp) row[1];
            LocalDate date = dateTs.toLocalDateTime().toLocalDate();

            String year = String.valueOf(date.getYear());
            String month = date.format(java.time.format.DateTimeFormatter.ofPattern("MMMM", java.util.Locale.FRENCH));
            String dateStr = date.format(DATE_FORMATTER_LONG);

            String type = (String) row[2];
            String description = (String) row[3];
            String document = (String) row[4];
            String devise = (String) row[5];
            BigDecimal montant = row[6] != null ? (BigDecimal) row[6] : BigDecimal.ZERO;
            String patientNom = (String) row[7];
            String patientPrenom = (String) row[8];
            String patientCode = (String) row[9];

            Row dataRow = sheet.createRow(rowNum++);

            // Année (fusionnée)
            if (!year.equals(currentYear)) {
                currentYear = year;
                dataRow.createCell(0).setCellValue(year);
            } else {
                dataRow.createCell(0).setCellValue("");
            }

            // Mois (fusionné)
            if (!month.equals(currentMonth)) {
                currentMonth = month;
                dataRow.createCell(1).setCellValue(month);
            } else {
                dataRow.createCell(1).setCellValue("");
            }

            // Date (fusionnée)
            if (!dateStr.equals(currentDate)) {
                currentDate = dateStr;
                dataRow.createCell(2).setCellValue(dateStr);
            } else {
                dataRow.createCell(2).setCellValue("");
            }

            // Type
            Cell typeCell = dataRow.createCell(3);
            typeCell.setCellValue(type.equals("ENTREE") ? "Paiement (Entrée)" : "Dépense (Sortie)");
            typeCell.setCellStyle(type.equals("ENTREE") ? greenStyle : redStyle);

            // Description
            dataRow.createCell(4).setCellValue(description != null ? description : "");
            dataRow.getCell(4).setCellStyle(dataStyle);

            // Devise
            dataRow.createCell(5).setCellValue(devise);
            dataRow.getCell(5).setCellStyle(dataStyle);

            // Montant
            Cell montantCell = dataRow.createCell(6);
            montantCell.setCellValue(montant.doubleValue());
            montantCell.setCellStyle(currencyStyle);

            // Patient/Fournisseur
            String patientFull = patientPrenom != null ? patientPrenom + " " + (patientNom != null ? patientNom : "") : (patientNom != null ? patientNom : "");
            if (patientCode != null) patientFull += " (" + patientCode + ")";
            dataRow.createCell(7).setCellValue(patientFull);
            dataRow.getCell(7).setCellStyle(dataStyle);

            // Document
            dataRow.createCell(8).setCellValue(document != null ? document : "");
            dataRow.getCell(8).setCellStyle(dataStyle);
        }

        // Largeurs de colonnes
        sheet.setColumnWidth(0, 10);
        sheet.setColumnWidth(1, 12);
        sheet.setColumnWidth(2, 25);
        sheet.setColumnWidth(3, 20);
        sheet.setColumnWidth(4, 40);
        sheet.setColumnWidth(5, 10);
        sheet.setColumnWidth(6, 15);
        sheet.setColumnWidth(7, 35);
        sheet.setColumnWidth(8, 20);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PDF - Tableau Synthèse
    // ═════════════════════════════════════════════════════════════════════════
    private void createPDFSyntheseTable(Document doc, LivreCaisseDTO.SyntheseResponse synthese) throws DocumentException {
        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10);

        // En-têtes
        String[] headers = {"DATE", "TYPE", "DEVISE", "ENTRÉE", "SORTIE", "SOLDE"};
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, new Font(Font.HELVETICA, 10, Font.BOLD)));
            cell.setBackgroundColor(new Color(0, 100, 0));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(5);
            table.addCell(cell);
        }

        // Données
        Font dataFont = new Font(Font.HELVETICA, 9, Font.NORMAL);
        Font greenFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(0, 128, 0));
        Font redFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(200, 0, 0));

        for (LivreCaisseDTO.SyntheseJournaliere jour : synthese.getJournal()) {
            // USD Entrée
            if (jour.getEntreeUSD().compareTo(BigDecimal.ZERO) > 0) {
                addPDFRow(table, jour.getDate().format(DATE_FORMATTER_LONG), "Paiement", "USD",
                        jour.getEntreeUSD().toString(), "-", jour.getSoldeUSD().toString(),
                        dataFont, greenFont, redFont, true);
            }

            // USD Sortie
            if (jour.getSortieUSD().compareTo(BigDecimal.ZERO) > 0) {
                addPDFRow(table, jour.getDate().format(DATE_FORMATTER_LONG), "Dépense", "USD",
                        "-", jour.getSortieUSD().toString(), jour.getSoldeUSD().toString(),
                        dataFont, greenFont, redFont, false);
            }

            // CDF Entrée
            if (jour.getEntreeCDF().compareTo(BigDecimal.ZERO) > 0) {
                addPDFRow(table, jour.getDate().format(DATE_FORMATTER_LONG), "Paiement", "CDF",
                        jour.getEntreeCDF().toString(), "-", jour.getSoldeCDF().toString(),
                        dataFont, greenFont, redFont, true);
            }

            // CDF Sortie
            if (jour.getSortieCDF().compareTo(BigDecimal.ZERO) > 0) {
                addPDFRow(table, jour.getDate().format(DATE_FORMATTER_LONG), "Dépense", "CDF",
                        "-", jour.getSortieCDF().toString(), jour.getSoldeCDF().toString(),
                        dataFont, greenFont, redFont, false);
            }
        }

        doc.add(table);
    }

    private void addPDFRow(PdfPTable table, String date, String type, String devise,
                          String entree, String sortie, String solde,
                          Font dataFont, Font greenFont, Font redFont, boolean isEntree) {
        table.addCell(new Phrase(date, dataFont));
        table.addCell(new Phrase(type, isEntree ? greenFont : redFont));
        table.addCell(new Phrase(devise, dataFont));
        table.addCell(new Phrase(entree, greenFont));
        table.addCell(new Phrase(sortie, redFont));
        table.addCell(new Phrase(solde, dataFont));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PDF - Tableau Détails
    // ═════════════════════════════════════════════════════════════════════════
    private void createPDFDetailsTable(Document document, LocalDate dateDebut, LocalDate dateFin, Long caissierId) throws DocumentException {
        Paragraph title = new Paragraph("DÉTAILS DES TRANSACTIONS", new Font(Font.HELVETICA, 14, Font.BOLD));
        title.setSpacingBefore(20);
        title.setSpacingAfter(10);
        document.add(title);

        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100);

        // En-têtes
        String[] headers = {"DATE", "TYPE", "DESCRIPTION", "DEVISE", "MONTANT", "PATIENT", "CAISSIER", "DOCUMENT"};
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, new Font(Font.HELVETICA, 9, Font.BOLD)));
            cell.setBackgroundColor(new Color(0, 100, 0));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(4);
            table.addCell(cell);
        }

        // Récupérer les détails
        List<Object[]> details;
        if (caissierId != null) {
            details = livreCaisseRepository.findTransactionsByPeriodeAndCaissier(dateDebut, dateFin, caissierId);
        } else {
            details = livreCaisseRepository.findTransactionsByPeriode(dateDebut, dateFin, org.springframework.data.domain.Pageable.unpaged()).getContent();
        }

        Font dataFont = new Font(Font.HELVETICA, 8, Font.NORMAL);
        Font greenFont = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(0, 128, 0));
        Font redFont = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(200, 0, 0));

        for (Object[] row : details) {
            java.sql.Timestamp dateTs = (java.sql.Timestamp) row[1];
            String type = (String) row[2];
            String description = (String) row[3];
            String docNum = (String) row[4];
            String devise = (String) row[5];
            BigDecimal montant = row[6] != null ? (BigDecimal) row[6] : BigDecimal.ZERO;
            String patientNom = (String) row[7];
            String patientPrenom = (String) row[8];
            String caissierNom = (String) row[11];

            table.addCell(new Phrase(dateTs.toLocalDateTime().format(DATE_FORMATTER_LONG), dataFont));
            table.addCell(new Phrase(type.equals("ENTREE") ? "Entrée" : "Sortie",
                    type.equals("ENTREE") ? greenFont : redFont));
            table.addCell(new Phrase(description != null ? description : "", dataFont));
            table.addCell(new Phrase(devise, dataFont));
            table.addCell(new Phrase(montant.toString(), dataFont));

            String patientFull = patientPrenom != null ? patientPrenom + " " + (patientNom != null ? patientNom : "") : (patientNom != null ? patientNom : "");
            table.addCell(new Phrase(patientFull, dataFont));
            table.addCell(new Phrase(caissierNom != null ? caissierNom : "", dataFont));
            table.addCell(new Phrase(docNum != null ? docNum : "", dataFont));
        }

        document.add(table);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // STYLES EXCEL
    // ═════════════════════════════════════════════════════════════════════════
    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.LEFT);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.RIGHT);
        DataFormat df = workbook.createDataFormat();
        style.setDataFormat(df.getFormat("#,##0.00"));
        return style;
    }

    private CellStyle createTotalStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createColoredStyle(Workbook workbook, short bgColor, short fontColor) {
        CellStyle style = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font font = workbook.createFont();
        font.setColor(fontColor);
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(bgColor);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    /**
     * Crée l'en-tête PDF avec les informations de l'hôpital et le logo
     */
    private void createPDFHeader(Document document, HospitalConfig config) throws DocumentException {
        // Récupérer le logo depuis AppConfig
        String logoUrl = null;
        try {
            Optional<AppConfig> appConfigOpt = appConfigRepository.findById(1L);
            if (appConfigOpt.isPresent()) {
                logoUrl = appConfigOpt.get().getLogoUrl();
            }
        } catch (Exception e) {
            log.warn("Impossible de récupérer le logo depuis AppConfig: {}", e.getMessage());
        }

        // Créer un tableau pour le logo et le texte
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setSpacingAfter(10);

        // Colonne gauche: Logo
        if (logoUrl != null && !logoUrl.isEmpty()) {
            try {
                // Convertir l'URL relative en chemin de fichier
                String logoPath = logoUrl.replace("/uploads/", "uploads/");
                java.io.File logoFile = new java.io.File(logoPath);

                if (logoFile.exists()) {
                    Image logo = Image.getInstance(logoFile.getAbsolutePath());
                    // Redimensionner le logo (max 80px de hauteur)
                    logo.scaleToFit(120, 80);
                    logo.setAlignment(Element.ALIGN_LEFT);

                    PdfPCell logoCell = new PdfPCell(logo, false);
                    logoCell.setBorder(PdfPCell.NO_BORDER);
                    logoCell.setHorizontalAlignment(Element.ALIGN_LEFT);
                    logoCell.setVerticalAlignment(Element.ALIGN_CENTER);
                    headerTable.addCell(logoCell);
                } else {
                    log.warn("Fichier logo non trouvé: {}", logoFile.getAbsolutePath());
                    PdfPCell emptyCell = new PdfPCell();
                    emptyCell.setBorder(PdfPCell.NO_BORDER);
                    headerTable.addCell(emptyCell);
                }
            } catch (Exception e) {
                log.warn("Erreur lors du chargement du logo: {}", e.getMessage());
                PdfPCell emptyCell = new PdfPCell();
                emptyCell.setBorder(PdfPCell.NO_BORDER);
                headerTable.addCell(emptyCell);
            }
        } else {
            PdfPCell emptyCell = new PdfPCell();
            emptyCell.setBorder(PdfPCell.NO_BORDER);
            headerTable.addCell(emptyCell);
        }

        // Colonne droite: Informations de l'hôpital
        PdfPCell infoCell = new PdfPCell();
        infoCell.setBorder(PdfPCell.NO_BORDER);
        infoCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        infoCell.setVerticalAlignment(Element.ALIGN_CENTER);

        // Nom de l'hôpital
        Font hospitalFont = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(0, 100, 0));
        Paragraph hospitalName = new Paragraph(config.getHospitalName() != null ? config.getHospitalName() : "INUA AFIA", hospitalFont);
        hospitalName.setAlignment(Element.ALIGN_RIGHT);
        infoCell.addElement(hospitalName);

        // Sous-titre si présent
        if (config.getHeaderSubtitle() != null && !config.getHeaderSubtitle().isEmpty()) {
            Font subtitleFont = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(80, 80, 80));
            Paragraph subtitle = new Paragraph(config.getHeaderSubtitle(), subtitleFont);
            subtitle.setAlignment(Element.ALIGN_RIGHT);
            infoCell.addElement(subtitle);
        }

        // Adresse
        StringBuilder address = new StringBuilder();
        if (config.getAddress() != null) address.append(config.getAddress());
        if (config.getCity() != null) {
            if (!address.isEmpty()) address.append(" - ");
            address.append(config.getCity());
        }
        if (config.getPhoneNumber() != null) {
            if (!address.isEmpty()) address.append(" | ");
            address.append("Tél: ").append(config.getPhoneNumber());
        }
        if (config.getEmail() != null) {
            if (!address.isEmpty()) address.append(" | ");
            address.append("Email: ").append(config.getEmail());
        }

        if (!address.isEmpty()) {
            Font addressFont = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(100, 100, 100));
            Paragraph addressPara = new Paragraph(address.toString(), addressFont);
            addressPara.setAlignment(Element.ALIGN_RIGHT);
            infoCell.addElement(addressPara);
        }

        headerTable.addCell(infoCell);
        document.add(headerTable);

        // Ligne de séparation
        LineSeparator line = new LineSeparator();
        line.setPercentage(80);
        document.add(line);
    }

    /**
     * Crée une configuration par défaut si aucune n'existe
     */
    private HospitalConfig createDefaultConfig() {
        HospitalConfig config = new HospitalConfig();
        config.setHospitalName("INUA AFIA - Système Hospitalier");
        config.setHeaderSubtitle("Gestion Intégrée des Services de Santé");
        config.setAddress("Adresse non configurée");
        config.setCity("Ville");
        config.setPhoneNumber("--");
        config.setEmail("contact@inuafia.com");
        return config;
    }
}
