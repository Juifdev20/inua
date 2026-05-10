import React, { useState, useEffect } from 'react';
import { pharmacieFinanceApi } from '../../services/pharmacieFinanceApi';
import { getAllMedications, getSuppliers } from '../../services/pharmacyApi/pharmacyApi';

/**
 * Page Pharmacie: Achat de médicaments avec création auto transaction Finance
 * Le pharmacien achète du stock, une transaction est automatiquement créée en attente de validation
 */
export default function AchatMedicament() {
  const [medications, setMedications] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    medicationId: '',
    quantity: '',
    unitPrice: '',
    supplierId: '',
  });

  useEffect(() => {
    loadMedicationsAndSuppliers();
  }, []);

  const loadMedicationsAndSuppliers = async () => {
    try {
      const [medsResponse, suppResponse] = await Promise.all([
        getAllMedications(),
        getSuppliers(),
      ]);
      setMedications(medsResponse.data?.content || medsResponse.data || []);
      setSuppliers(suppResponse.data || []);
    } catch (err) {
      console.error('Erreur chargement:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await pharmacieFinanceApi.acheterMedicament(
        formData.medicationId,
        {
          quantity: parseInt(formData.quantity),
          unitPrice: parseFloat(formData.unitPrice),
          supplierId: parseInt(formData.supplierId),
        }
      );

      setSuccess({
        message: response.data.message,
        financeTransactionId: response.data.financeTransactionId,
        medication: response.data.medication,
      });

      // Reset form
      setFormData({
        medicationId: '',
        quantity: '',
        unitPrice: '',
        supplierId: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedMed = medications.find(m => m.id === parseInt(formData.medicationId));
  const totalAmount = formData.quantity && formData.unitPrice 
    ? parseInt(formData.quantity) * parseFloat(formData.unitPrice)
    : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Achat de Médicaments</h1>
      <p className="text-gray-600 mb-6">
        L'achat créera automatiquement une transaction dans le module Finance 
        en attente de validation par le caissier.
      </p>

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Achat effectué avec succès !
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p>Stock mis à jour: <strong>{success.medication?.name}</strong></p>
            <p>Transaction Finance créée: <strong>#{success.financeTransactionId}</strong></p>
            <p>Statut: <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">En attente validation</span></p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
          <strong>Erreur:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* Médicament */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Médicament <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.medicationId}
            onChange={(e) => setFormData({ ...formData, medicationId: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          >
            <option value="">Sélectionnez un médicament...</option>
            {medications.map((med) => (
              <option key={med.id} value={med.id}>
                {med.name} (Stock: {med.currentStock})
              </option>
            ))}
          </select>
        </div>

        {/* Fournisseur */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Fournisseur <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.supplierId}
            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          >
            <option value="">Sélectionnez un fournisseur...</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantité et Prix */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Quantité <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ex: 100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Prix Unitaire (CDF) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ex: 5000"
              required
            />
          </div>
        </div>

        {/* Récapitulatif */}
        {totalAmount > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-blue-800">Montant Total:</span>
              <span className="text-2xl font-bold text-blue-900">
                {new Intl.NumberFormat('fr-CD', {
                  style: 'currency',
                  currency: 'CDF',
                  minimumFractionDigits: 0,
                }).format(totalAmount)}
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              Cette dépense sera enregistrée en attente de validation par le caissier.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !totalAmount}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Traitement en cours...
            </span>
          ) : (
            'Effectuer l\'achat'
          )}
        </button>
      </form>

      {/* Info */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <strong>📋 Processus:</strong>
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li>Pharmacien effectue l'achat (cette page)</li>
          <li>Transaction créée automatiquement en attente</li>
          <li>Caissier reçoit notification avec scan facture à valider</li>
          <li>Validation = Décaissement ou Crédit selon mode choisi</li>
        </ol>
      </div>
    </div>
  );
}
