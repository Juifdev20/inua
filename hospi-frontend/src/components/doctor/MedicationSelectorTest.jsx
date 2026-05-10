import React from 'react';
import MedicationSelector from './MedicationSelector';

// Composant de test pour le sélecteur de médicaments
const MedicationSelectorTest = () => {
  const [selectedMedication, setSelectedMedication] = React.useState(null);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Test du Sélecteur de Médicaments</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Sélectionnez un médicament :
          </label>
          <MedicationSelector
            selectedMedication={selectedMedication}
            onMedicationSelect={setSelectedMedication}
            placeholder="Choisir un médicament..."
          />
        </div>
        
        {selectedMedication && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Médicament sélectionné :</h3>
            <div className="text-sm space-y-1">
              <p><strong>Nom :</strong> {selectedMedication.name}</p>
              <p><strong>Code :</strong> {selectedMedication.medicationCode}</p>
              <p><strong>DCI :</strong> {selectedMedication.genericName || 'N/A'}</p>
              <p><strong>Stock :</strong> {selectedMedication.stockQuantity || 0}</p>
              <p><strong>Forme :</strong> {selectedMedication.form || 'N/A'}</p>
              <p><strong>Prix :</strong> {selectedMedication.unitPrice || 0} FCFA</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationSelectorTest;
