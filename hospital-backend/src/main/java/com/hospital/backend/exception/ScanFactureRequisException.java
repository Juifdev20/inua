package com.hospital.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception levée lorsque le scan de facture est manquant pour la validation
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ScanFactureRequisException extends RuntimeException {
    
    public ScanFactureRequisException() {
        super("Le scan de la facture fournisseur est obligatoire pour valider une dépense");
    }
    
    public ScanFactureRequisException(String message) {
        super(message);
    }
}
