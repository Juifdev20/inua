import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import HospitalConfigForm from '../../components/admin/HospitalConfigForm';

const HospitalSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsive mobile */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/profile')}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Retour au profil</span>
                <span className="sm:hidden">Retour</span>
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h1 className="text-lg sm:text-xl font-semibold truncate">Paramètres du Système</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Configuration de l'Hôpital</h2>
            <p className="text-muted-foreground">
              Personnalisez les informations de votre établissement. Ces données apparaîtront sur toutes les fiches médicales, 
              factures et documents générés par le système.
            </p>
          </div>

          <HospitalConfigForm />
        </div>
      </div>
    </div>
  );
};

export default HospitalSettings;
