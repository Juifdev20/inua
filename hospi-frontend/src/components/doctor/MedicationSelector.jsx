import React, { useState, useEffect } from 'react';
import { medicationAPI } from '../../api/medication';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Loader2, Package, AlertTriangle } from 'lucide-react';

const MedicationSelector = ({ 
  selectedMedication, 
  onMedicationSelect, 
  placeholder = "Sélectionner un médicament...",
  className = ""
}) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await medicationAPI.getInventory();
      const medicationsList = response.data || [];
      setMedications(medicationsList.filter(med => med.isActive !== false));
    } catch (err) {
      console.error('Erreur lors du chargement des médicaments:', err);
      setError('Impossible de charger les médicaments');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (medication) => {
    const currentStock = medication.stockQuantity || 0;
    const minimumStock = medication.minimumStock || 10;
    
    if (currentStock === 0) {
      return { 
        label: 'Rupture', 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertTriangle
      };
    }
    if (currentStock <= minimumStock) {
      return { 
        label: 'Stock faible', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertTriangle
      };
    }
    return { 
      label: 'Disponible', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: Package
    };
  };

  const filteredMedications = medications.filter(medication => 
    medication.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medication.medicationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medication.genericName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement des médicaments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-red-50 border-red-200">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-700">{error}</span>
        <button 
          onClick={loadMedications}
          className="text-xs text-red-600 hover:text-red-800 underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select
        value={selectedMedication?.id || ''}
        onValueChange={(value) => {
          const medication = medications.find(med => med.id === parseInt(value));
          onMedicationSelect(medication);
        }}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {filteredMedications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchTerm ? 'Aucun médicament trouvé' : 'Aucun médicament disponible'}
            </div>
          ) : (
            filteredMedications.map((medication) => {
              const stockStatus = getStockStatus(medication);
              const StatusIcon = stockStatus.icon;
              
              return (
                <SelectItem 
                  key={medication.id} 
                  value={medication.id.toString()}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full p-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {medication.name}
                        </span>
                        {medication.genericName && (
                          <span className="text-xs text-muted-foreground truncate">
                            ({medication.genericName})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {medication.medicationCode}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Stock: {medication.stockQuantity || 0}
                        </span>
                        {medication.form && (
                          <span className="text-xs text-muted-foreground">
                            • {medication.form}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <StatusIcon className="w-3 h-3" />
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] px-1.5 py-0 ${stockStatus.color}`}
                      >
                        {stockStatus.label}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
      
      {medications.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {medications.length} médicament{medications.length > 1 ? 's' : ''} disponible{medications.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default MedicationSelector;
