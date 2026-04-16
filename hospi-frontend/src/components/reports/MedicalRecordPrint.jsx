import React, { forwardRef } from 'react';
import { Building2, User, Stethoscope, Activity, FlaskConical, FileText, Pill, Wallet } from 'lucide-react';

/**
 * Composant d'impression médicale professionnelle
 * Format A4 avec en-tête institutionnel, contenu médical structuré
 * et pied de page avec signature et numérotation
 */
const MedicalRecordPrint = forwardRef(({ report, config }, ref) => {
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div ref={ref} className="medical-print-container">
      {/* En-tête institutionnel */}
      <header className="print-header">
        <div className="header-left">
          <div className="logo-container">
            {config?.hospitalLogoUrl ? (
              <img
                src={config.hospitalLogoUrl}
                alt={config.hospitalName}
                className="hospital-logo"
              />
            ) : (
              <Building2 className="default-logo" />
            )}
          </div>
          <div className="hospital-info">
            <h1 className="hospital-name">{config?.hospitalName || 'INUA AFIA'}</h1>
            <p className="hospital-subtitle">
              {config?.ministryName && `${config.ministryName} - `}
              {config?.zoneName || 'Système de Gestion Hospitalière'}
            </p>
            {(config?.departmentName || config?.region) && (
              <p className="hospital-location">
                {config?.departmentName}
                {config?.departmentName && config?.region && ' | '}
                {config?.region}
                {config?.country && ` - ${config.country}`}
              </p>
            )}
          </div>
        </div>
        <div className="header-right">
          <div className="fiche-number-box">
            <p className="fiche-label">N° DE FICHE</p>
            <p className="fiche-value">{report?.numeroFiche || report?.consultationCode || 'N/A'}</p>
          </div>
          <p className="print-date">Généré: {formatDateShort(report?.reportGeneratedAt || new Date())}</p>
        </div>
      </header>

      {/* Titre du document */}
      <div className="document-title">
        <h2>FICHE MEDICALE INDIVIDUELLE</h2>
      </div>

      {/* Section 1: Identification Patient */}
      <section className="print-section">
        <div className="section-header">
          <User className="section-icon" />
          <h3>Identification du Patient</h3>
        </div>
        <div className="section-content two-columns">
          <div className="info-row">
            <span className="info-label">Nom:</span>
            <span className="info-value">{report?.patientName || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Code Patient:</span>
            <span className="info-value">{report?.patientCode || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Sexe:</span>
            <span className="info-value">{report?.patientGender || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Age:</span>
            <span className="info-value">{report?.patientAge || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Tel:</span>
            <span className="info-value">{report?.patientPhone || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Date:</span>
            <span className="info-value">{formatDate(report?.consultationDate)}</span>
          </div>
        </div>
      </section>

      {/* Section 2: Médecin Traitant */}
      <section className="print-section">
        <div className="section-header">
          <Stethoscope className="section-icon" />
          <h3>Médecin Traitant</h3>
        </div>
        <div className="section-content two-columns">
          <div className="info-row">
            <span className="info-label">Nom:</span>
            <span className="info-value">{report?.doctorName || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Spécialité:</span>
            <span className="info-value">{report?.doctorSpecialty || 'Médecine Générale'}</span>
          </div>
        </div>
      </section>

      {/* Section 3: Constantes Vitales */}
      {report?.triageInfo && (
        <section className="print-section">
          <div className="section-header">
            <Activity className="section-icon" />
            <h3>Constantes Vitales</h3>
          </div>
          <div className="section-content">
            <div className="vitals-grid">
              <div className="vital-item">
                <span className="vital-label">Température</span>
                <span className="vital-value">{report.triageInfo.temperature || '-'}°C</span>
              </div>
              <div className="vital-item">
                <span className="vital-label">Tension</span>
                <span className="vital-value">{report.triageInfo.tensionArterielle || '-'}</span>
              </div>
              <div className="vital-item">
                <span className="vital-label">Poids</span>
                <span className="vital-value">{report.triageInfo.poids || '-'} kg</span>
              </div>
              <div className="vital-item">
                <span className="vital-label">Taille</span>
                <span className="vital-value">{report.triageInfo.taille || '-'} cm</span>
              </div>
            </div>
            {report.triageInfo.motifVisite && (
              <div className="motif-box">
                <span className="motif-label">Motif de visite:</span>
                <span className="motif-value">{report.triageInfo.motifVisite}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Section 4: Résultats Laboratoire */}
      {report?.labResults && report.labResults.length > 0 && (
        <section className="print-section">
          <div className="section-header">
            <FlaskConical className="section-icon" />
            <h3>Résultats de Laboratoire</h3>
          </div>
          <div className="section-content">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Examen</th>
                  <th>Résultat</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {report.labResults.map((lab, index) => (
                  <tr key={index}>
                    <td>{lab.testName}</td>
                    <td>{lab.resultValue || 'En attente'}</td>
                    <td>
                      <span className={`status-badge ${lab.isCritical ? 'critical' : 'normal'}`}>
                        {lab.isCritical ? 'Critique' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section 5: Prescription Médicale */}
      {report?.prescription && (
        <section className="print-section">
          <div className="section-header">
            <FileText className="section-icon" />
            <h3>Prescription Médicale</h3>
          </div>
          <div className="section-content">
            {report.prescription.diagnosis && (
              <div className="diagnosis-row">
                <span className="info-label">Diagnostic:</span>
                <span className="info-value">{report.prescription.diagnosis}</span>
              </div>
            )}
            {report.prescription.items && report.prescription.items.length > 0 && (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Médicament</th>
                    <th>Dosage</th>
                    <th>Fréquence</th>
                  </tr>
                </thead>
                <tbody>
                  {report.prescription.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.medicationName}</td>
                      <td>{item.dosage}</td>
                      <td>{item.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* Section 6: Pharmacie */}
      {report?.pharmacyStatus && (
        <section className="print-section">
          <div className="section-header">
            <Pill className="section-icon" />
            <h3>Dispensation Pharmacie</h3>
          </div>
          <div className="section-content">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Médicament</th>
                  <th className="text-center">Prescrit</th>
                  <th className="text-center">Délivré</th>
                </tr>
              </thead>
              <tbody>
                {report.pharmacyStatus.items?.map((item, index) => (
                  <tr key={index}>
                    <td>{item.medicationName}</td>
                    <td className="text-center">{item.prescribedQty}</td>
                    <td className="text-center">{item.deliveredQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section 7: Facturation */}
      {report?.billingSummary && (
        <section className="print-section">
          <div className="section-header">
            <Wallet className="section-icon" />
            <h3>Facturation</h3>
          </div>
          <div className="section-content">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-right">Montant</th>
                  <th className="text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consultation</td>
                  <td className="text-right">{report.billingSummary.consultationAmount?.toLocaleString()} $</td>
                  <td className="text-center">
                    <span className={`status-badge ${report.billingSummary.consultationPaid ? 'paid' : 'pending'}`}>
                      {report.billingSummary.consultationPaid ? 'Payé' : 'En attente'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Laboratoire</td>
                  <td className="text-right">{report.billingSummary.labAmount?.toLocaleString()} $</td>
                  <td className="text-center">
                    <span className={`status-badge ${report.billingSummary.labPaid ? 'paid' : 'pending'}`}>
                      {report.billingSummary.labPaid ? 'Payé' : 'En attente'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="billing-summary">
              <div className="summary-row">
                <span>TOTAL</span>
                <span className="total-value">{report.billingSummary.totalAmount?.toLocaleString()} $</span>
              </div>
              <div className="summary-row">
                <span>PAYÉ</span>
                <span>{report.billingSummary.totalPaid?.toLocaleString()} $</span>
              </div>
              <div className="summary-row balance">
                <span>RESTE</span>
                <span className={`balance-value ${report.billingSummary.balanceDue > 0 ? 'unpaid' : 'paid'}`}>
                  {report.billingSummary.balanceDue?.toLocaleString()} $
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pied de page avec signature */}
      <footer className="print-footer">
        <div className="footer-left">
          <div className="signature-section">
            <p className="signature-label">Signature du Médecin Traitant</p>
            {report?.signatureImage ? (
              <img
                src={report.signatureImage}
                alt="Signature du médecin"
                className="doctor-signature"
              />
            ) : (
              <div className="signature-line"></div>
            )}
            <p className="doctor-name">{report?.doctorName || 'Dr. _____________'}</p>
            {report?.dateValidation && (
              <p className="validation-date">
                Validé le: {formatDateShort(report.dateValidation)}
              </p>
            )}
          </div>
        </div>
        <div className="footer-right">
          <div className="validation-info">
            {report?.isValidated && (
              <div className="validation-badge">
                <span className="validation-icon">✓</span>
                <span>FICHE VALIDÉE</span>
              </div>
            )}
            {report?.generatedBy && (
              <p className="generated-by">Document généré par: {report.generatedBy}</p>
            )}
          </div>
        </div>
      </footer>

      {/* Numéro de page */}
      <div className="page-number">
        Page 1 sur 1
      </div>
    </div>
  );
});

MedicalRecordPrint.displayName = 'MedicalRecordPrint';

export default MedicalRecordPrint;
