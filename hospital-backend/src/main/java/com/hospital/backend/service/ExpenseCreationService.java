package com.hospital.backend.service;

import com.hospital.backend.entity.Expense;
import com.hospital.backend.entity.FinanceTransaction;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.ExpenseRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseCreationService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void creerExpenseFromTransaction(FinanceTransaction transaction, User validatedBy) {
        try {
            User userRef = userRepository.findById(validatedBy.getId()).orElse(null);
            if (userRef == null) {
                log.error("Utilisateur {} non trouvé pour création Expense", validatedBy.getId());
                return;
            }
            
            // Utiliser la date de décaissement ou de validation de la transaction
            // pour que l'Expense apparaisse au bon jour dans le Livre de Caisse
            LocalDateTime expenseDate = transaction.getDateDecaissement() != null 
                ? transaction.getDateDecaissement() 
                : (transaction.getDateValidation() != null ? transaction.getDateValidation() : LocalDateTime.now());
            
            log.info("📅 Expense créée avec date: {} (decaissement: {}, validation: {})", 
                expenseDate, transaction.getDateDecaissement(), transaction.getDateValidation());
            
            Expense expense = Expense.builder()
                .amount(transaction.getMontant())
                .category(Expense.ExpenseCategory.PHARMACIE)
                .currency(transaction.getDevise())
                .date(expenseDate)
                .description("Validation dépense: " + (transaction.getCategorie() != null ? transaction.getCategorie() : "Achat Médicaments"))
                .createdBy(userRef)
                .build();
            Expense saved = expenseRepository.save(expense);
            expenseRepository.flush();
            log.info("✅ Expense créée ID: {} pour transaction {}", saved.getId(), transaction.getId());
        } catch (Exception e) {
            log.error("❌ Erreur création Expense pour transaction {}: {}", transaction.getId(), e.getMessage(), e);
        }
    }
}
