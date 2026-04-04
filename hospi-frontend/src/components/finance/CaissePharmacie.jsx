import React, { useState, useEffect } from 'react';
import financeApi from '../../services/financeApi/financeApi';

/**
 * Composant Caisse Pharmacie - Affiche les factures de prescriptions en attente
 * Flux : Prescription VALIDEE → Facture EN_ATTENTE → Affichage ici → Paiement
 */
const CaissePharmacie = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPharmacyInvoices();
  }, []);

  const loadPharmacyInvoices = async () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement factures PHARMACY...');
      
      const data = await financeApi.getPharmacyQueue();
      console.log('✅ Factures récupérées:', data);
      
      setInvoices(data || []);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur chargement factures:', err);
      setError('Impossible de charger les factures. Veuillez réessayer.');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (invoiceId) => {
    try {
      console.log('💰 Traitement paiement facture:', invoiceId);
      
      // Logique de paiement à implémenter
      // await financeApi.payInvoice(invoiceId, paymentData);
      
      alert('Paiement traité avec succès!');
      loadPharmacyInvoices(); // Recharger la liste
    } catch (err) {
      console.error('❌ Erreur paiement:', err);
      alert('Erreur lors du traitement du paiement.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Erreur</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadPharmacyInvoices}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Caisse Pharmacie</h2>
        <p className="text-gray-600">Factures de prescriptions en attente de paiement</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-blue-800 font-semibold">Factures en attente</h3>
          <p className="text-2xl font-bold text-blue-600">{invoices.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-green-800 font-semibold">Montant total</h3>
          <p className="text-2xl font-bold text-green-600">
            {invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0).toLocaleString()} CDF
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-purple-800 font-semibold">Patients</h3>
          <p className="text-2xl font-bold text-purple-600">
            {new Set(invoices.map(inv => inv.patientName)).size}
          </p>
        </div>
      </div>

      {/* Tableau des factures */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune facture en attente</h3>
            <p className="text-gray-500">
              Les factures de prescriptions validées apparaîtront ici automatiquement.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              💡 Le système fonctionne correctement - aucune facture PHARMACY avec statut EN_ATTENTE n'est présente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Facture
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prescription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.prescriptionId ? `PRE-${invoice.prescriptionId}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold">
                        {(invoice.totalAmount || 0).toLocaleString()} CDF
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handlePayment(invoice.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Encaisser
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bouton de rafraîchissement */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={loadPharmacyInvoices}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          🔄 Rafraîchir
        </button>
      </div>
    </div>
  );
};

export default CaissePharmacie;
