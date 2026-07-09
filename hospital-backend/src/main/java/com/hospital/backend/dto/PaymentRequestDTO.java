package com.hospital.backend.dto;

import lombok.*;

/**
 * Requête de paiement (simulation) soumise depuis le formulaire moderne.
 * Aucune donnée bancaire réelle n'est traitée : seul un détail masqué est conservé.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequestDTO {
    private Long hospitalId;      // hôpital concerné
    private String plan;          // STANDARD | PREMIUM | ENTERPRISE
    private String period;        // MONTHLY | ANNUAL
    private String method;        // VISA | MASTERCARD | MPESA | AIRTEL | BANK
    private String payerName;     // nom du payeur / titulaire
    private String payerDetail;   // ex: n° masqué "**** 4242", ou n° mobile money
}
