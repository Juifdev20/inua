package com.hospital.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception levée lorsqu'une transaction existe déjà pour une commande
 * Évite les doublons dans le flux Pharmacie-Finance
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class TransactionExistanteException extends RuntimeException {
    
    public TransactionExistanteException(Long commandeId) {
        super(String.format("Une transaction existe déjà pour la commande %d", commandeId));
    }
    
    public TransactionExistanteException(String message) {
        super(message);
    }
}
