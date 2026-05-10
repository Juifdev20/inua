# TODO_FINANCE_REFACTOR.md - Module Finance Refactor (Approved Plan)

## ✅ DONE
- [x] 1. Create FinanceContext.jsx (clone AdminContext sidebar states)
- [x] 2. Update FinanceLayout.jsx (pixel-perfect AdminLayout clone)
- [x] 3. Update FinanceSidebar.jsx (clone Sidebar.jsx, Finance menu)
- [x] 4. Update FinanceHeader.jsx (clone Topbar.jsx, profile/notifs/theme)
- [x] 5. Create FinanceRoute.jsx (ProtectedRoute allowedRoles=['FINANCE'])
- [x] 6. Update src/services/financeApi/financeApi.js (remove ALL MOCK_DATA, real axios)
- [x] 7. Backend: Create Expense.java, ExpenseDTO.java, ExpenseRepository.java, ExpenseService.java/impl.java
- [x] 8. Backend: ExpenseController.java (CRUD + stats)
- [x] 10. Frontend NEW: src/pages/finance/Expenses.jsx (CRUD + charts)
- [x] 11. Frontend NEW: src/pages/finance/Tarifs.jsx (PriceList editor)
- [x] 12. Frontend NEW: src/components/modals/ReceiptModal.jsx (printable post-pay)
- [x] 13. Update App.jsx (add /finance/* → FinanceRoute)

## ⚠️ PENDING (Backend compile errors fixed in next steps)
- [ ] 8. Backend: Update FinanceController.java (/dashboard/stats, /queues/{type}, /payments/process)
- [ ] 9. Backend: Update InvoiceServiceImpl.java (processPayment pivot)
- [ ] 14. Refactor Caisse pages (max-w-7xl, rounded-[32px])
- [ ] 15. Full test

**Backend compile**: Run `cd ../hospital-backend && mvn clean compile` - fix any remaining errors (UserService in ExpenseServiceImpl if needed).
