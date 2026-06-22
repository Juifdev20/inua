package com.hospital.backend.service;

import com.hospital.backend.entity.Hospital;
import com.hospital.backend.entity.User;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

@Service
@Slf4j
public class AdminCredentialsPdfService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] generate(User admin, String plainPassword, Hospital hospital) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            // Title
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new Color(0x1e, 0x40, 0xaf));
            Paragraph title = new Paragraph("INUA AFYA — Credentials Administrateur", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            doc.add(title);

            // Subtitle
            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 12, new Color(0x55, 0x55, 0x55));
            Paragraph sub = new Paragraph("Document confidentiel — Ne pas partager", subFont);
            sub.setAlignment(Element.ALIGN_CENTER);
            sub.setSpacingAfter(30);
            doc.add(sub);

            // Hospital info
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 11);

            doc.add(createLine("Hopital", hospital.getNom(), labelFont, valueFont));
            doc.add(createLine("Code hopital", hospital.getCode(), labelFont, valueFont));
            doc.add(createLine("Date de creation", admin.getCreatedAt().format(FMT), labelFont, valueFont));
            doc.add(Chunk.NEWLINE);

            // Separator
            doc.add(new Paragraph("________________________________________________________", subFont));
            doc.add(Chunk.NEWLINE);

            // Credentials block
            Font credTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, new Color(0x1e, 0x40, 0xaf));
            doc.add(new Paragraph("Informations de connexion", credTitle));
            doc.add(Chunk.NEWLINE);

            Font boxLabel = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(0x22, 0x22, 0x22));
            Font boxValue = FontFactory.getFont(FontFactory.HELVETICA, 11, new Color(0x00, 0x66, 0x33));

            doc.add(createLine("Nom d'utilisateur (username)", admin.getUsername(), boxLabel, boxValue));
            doc.add(createLine("Email", admin.getEmail(), boxLabel, boxValue));
            doc.add(createLine("Mot de passe temporaire", plainPassword, boxLabel, boxValue));
            doc.add(createLine("Role", "ADMIN", boxLabel, boxValue));
            doc.add(Chunk.NEWLINE);

            // Warning block
            Font warnTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(0xb4, 0x4a, 0x0a));
            doc.add(new Paragraph("IMPORTANT", warnTitle));

            Font warnFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(0x66, 0x33, 0x00));
            doc.add(new Paragraph("• A votre premiere connexion, le systeme vous obligera a changer ce mot de passe.", warnFont));
            doc.add(new Paragraph("• Ne partagez jamais ce document avec un tiers.", warnFont));
            doc.add(new Paragraph("• Conservez-le dans un endroit securise.", warnFont));
            doc.add(new Paragraph("• Ce mot de passe temporaire est a usage unique.", warnFont));

            // Footer
            doc.add(Chunk.NEWLINE);
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(0x99, 0x99, 0x99));
            Paragraph footer = new Paragraph("Genere par Inua Afya — " + java.time.LocalDateTime.now().format(FMT), footerFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("[PDF] Erreur generation credentials admin: {}", e.getMessage());
            throw new RuntimeException("Erreur generation PDF", e);
        }
    }

    private Paragraph createLine(String label, String value, Font labelFont, Font valueFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + ": ", labelFont));
        p.add(new Chunk(value, valueFont));
        p.setSpacingAfter(6);
        return p;
    }

    public String toBase64(byte[] pdfBytes) {
        return Base64.getEncoder().encodeToString(pdfBytes);
    }
}
