package com.hospital.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception levée lorsqu'on tente de modifier une transaction immutable
 * (déjà validée, payée ou contre-passée)
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class TransactionImmutableException extends RuntimeException {
    
    public TransactionImmutableException(Long transactionId) {
        super(String.format("La transaction %d est immutable et ne peut plus être modifiée", transactionId));
    }
    
    public TransactionImmutableException(String message) {
        super(message);
    }
}
