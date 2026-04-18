import React, { useState, useEffect } from 'react';
import { pharmacieFinanceApi } from '../../services/pharmacieFinanceApi';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Page Finance: Validation des dépenses en attente
 * Le caissier voit les achats pharmacie et valide avec scan
 */
export default function DepensesEnAttente() {
  const [transactions, setTransactions] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal validation
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [scanFile, setScanFile] = useState(null);
  const [modePaiement, setModePaiement] = useState('CREDIT');
  const [caisseId, setCaisseId] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txResponse, caissesResponse] = await Promise.all([
        pharmacieFinanceApi.getDepensesEnAttente(),
        pharmacieFinanceApi.getCaisses(),
      ]);
      setTransactions(txResponse.data || []);
      setCaisses(caissesResponse.data || []);
    } catch (err) {
      setError('Erreur chargement: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!scanFile) {
      alert('Scan de facture obligatoire !');
      return;
    }
    if (modePaiement === 'IMMEDIAT' && !caisseId) {
      alert('Sélectionnez une caisse pour le paiement immédiat');
      return;
    }

    try {
      setValidating(true);
      const formData = new FormData();
      formData.append('scanFacture', scanFile);
      formData.append('modePaiement', modePaiement);
      if (caisseId) formData.append('caisseId', caisseId);
      if (dateEcheance) formData.append('dateEcheance', dateEcheance);

      await pharmacieFinanceApi.validerDepense(selectedTransaction.id, formData);
      
      alert('Dépense validée avec succès !');
      setSelectedTransaction(null);
      setScanFile(null);
      loadData(); // Recharger la liste
    } catch (err) {
      alert('Erreur validation: ' + (err.response?.data?.message || err.message));
    } finally {
      setValidating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'EN_ATTENTE_SCAN': return 'bg-yellow-100 text-yellow-800';
      case 'A_PAYER': return 'bg-blue-100 text-blue-800';
      case 'PAYE': return 'bg-green-100 text-green-800';
      case 'CONTRE_PASSEE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'EN_ATTENTE_SCAN': return 'En attente scan';
      case 'A_PAYER': return 'À payer (crédit)';
      case 'PAYE': return 'Payé';
      case 'CONTRE_PASSEE': return 'Annulé (avoir)';
      default: return status;
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Validation des Dépenses</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-700">
            {transactions.filter(t => t.status === 'EN_ATTENTE_SCAN').length}
          </div>
          <div className="text-sm text-yellow-600">En attente</div>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Fournisseur</th>
              <th className="px-4 py-3 text-left">Référence</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  Aucune dépense en attente 🎉
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">#{tx.id}</td>
                  <td className="px-4 py-3">{tx.fournisseurNom || '-'}</td>
                  <td className="px-4 py-3">{tx.referenceFournisseur || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(tx.montant, tx.devise)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
                      {getStatusLabel(tx.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(tx.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.status === 'EN_ATTENTE_SCAN' && (
                      <button
                        onClick={() => setSelectedTransaction(tx)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Valider
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Validation */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Valider la Dépense #{selectedTransaction.id}</h2>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="flex justify-between">
                <span>Fournisseur:</span>
                <span className="font-medium">{selectedTransaction.fournisseurNom}</span>
              </div>
              <div className="flex justify-between">
                <span>Montant:</span>
                <span className="font-medium">
                  {formatCurrency(selectedTransaction.montant, selectedTransaction.devise)}
                </span>
              </div>
            </div>

            <form onSubmit={handleValidate} className="space-y-4">
              {/* Upload scan */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Scan Facture Fournisseur <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setScanFile(e.target.files[0])}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG ou PNG (obligatoire)
                </p>
              </div>

              {/* Mode paiement */}
              <div>
                <label className="block text-sm font-medium mb-1">Mode de Paiement</label>
                <select
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="CREDIT">Crédit (Dette fournisseur)</option>
                  <option value="IMMEDIAT">Immédiat (Décaissement caisse)</option>
                </select>
              </div>

              {/* Caisse (si immédiat) */}
              {modePaiement === 'IMMEDIAT' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Caisse <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={caisseId}
                    onChange={(e) => setCaisseId(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Sélectionnez...</option>
                    {caisses
                      .filter(c => c.devise === selectedTransaction.devise)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom} (Solde: {formatCurrency(c.solde, c.devise)})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Devise requise: {selectedTransaction.devise}
                  </p>
                </div>
              )}

              {/* Date échéance (si crédit) */}
              {modePaiement === 'CREDIT' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Date Échéance Paiement</label>
                  <input
                    type="date"
                    value={dateEcheance}
                    onChange={(e) => setDateEcheance(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Défaut: 30 jours
                  </p>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="flex-1 border rounded px-4 py-2 hover:bg-gray-50"
                  disabled={validating}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={validating}
                >
                  {validating ? 'Validation...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
