package com.hospital.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception levée lorsque le solde de caisse est insuffisant pour un décaissement
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class SoldeInsuffisantException extends RuntimeException {
    
    public SoldeInsuffisantException(String message) {
        super(message);
    }
    
    public SoldeInsuffisantException(String caisseNom, java.math.BigDecimal solde, java.math.BigDecimal montantRequis) {
        super(String.format("Solde insuffisant dans la caisse '%s' (solde: %s, requis: %s)", 
            caisseNom, solde, montantRequis));
    }
}
