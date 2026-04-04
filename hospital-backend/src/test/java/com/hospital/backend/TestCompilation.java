package com.hospital.backend;

import com.hospital.backend.entity.*;
import com.hospital.backend.service.InvoiceService;
import com.hospital.backend.service.impl.InvoiceServiceImpl;
import com.hospital.backend.controller.PrescriptionInvoiceController;

// Test simple pour vérifier que toutes les classes compilent
public class TestCompilation {
    
    // Test que les enums existent
    private DepartmentSource departmentSource = DepartmentSource.PHARMACY;
    private InvoiceStatus invoiceStatus = InvoiceStatus.EN_ATTENTE;
    private PrescriptionStatus prescriptionStatus = PrescriptionStatus.VALIDEE;
    private PaymentMethod paymentMethod = PaymentMethod.ESPECES;
    
    // Test que les services peuvent être instanciés (théoriquement)
    // InvoiceService invoiceService = new InvoiceServiceImpl();
    // PrescriptionInvoiceController controller = new PrescriptionInvoiceController();
}
