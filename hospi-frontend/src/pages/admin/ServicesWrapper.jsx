import React, { useState } from 'react';
import { Stethoscope, FlaskConical } from 'lucide-react';
import Services from './Services';
import ExamensManagement from './ExamensManagement';

/**
 * ★ WRAPPER AVEC ONGLETS POUR SERVICES ET EXAMENS
 * 
 * Ce composant affiche des onglets permettant de basculer entre:
 * - La gestion des services (Consultation, Opération, etc.)
 * - La gestion des examens de laboratoire (Glycémie, CRP, NFS, etc.)
 */
const ServicesWrapper = () => {
  const [activeTab, setActiveTab] = useState('services');

  return (
    <div className="p-6 space-y-6">
      {/* HEADER AVEC ONGLETS */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold font-space-grotesk">Gestion des Services</h1>
        
        {/* ONGLETS */}
        <div className="flex p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'services' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Services
          </button>
          <button
            onClick={() => setActiveTab('examens')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'examens' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Examens Labo
          </button>
        </div>
      </div>

      {/* CONTENU CONDITIONNEL */}
      {activeTab === 'services' ? (
        <Services />
      ) : (
        <ExamensManagement />
      )}
    </div>
  );
};

export default ServicesWrapper;
