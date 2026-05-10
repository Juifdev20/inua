import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ForcePasswordChange from './ForcePasswordChange';
import accountCreationApi from '@/services/accountCreationApi';
import { toast } from 'sonner';

/**
 * ★ WRAPPER POUR LE CHANGEMENT DE MOT DE PASSE OBLIGATOIRE
 * Vérifie le statut mustChangePassword et bloque l'accès si nécessaire
 */
const PasswordChangeWrapper = ({ children }) => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [mustChange, setMustChange] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPasswordStatus = async () => {
      if (!isAuthenticated) {
        setChecking(false);
        return;
      }

      // Vérifier d'abord dans le user stocké
      if (user?.mustChangePassword) {
        setMustChange(true);
        setChecking(false);
        return;
      }

      // Sinon, vérifier via l'API
      try {
        const response = await accountCreationApi.getMustChangeStatus();
        if (response?.data?.mustChangePassword) {
          setMustChange(true);
          // Mettre à jour le user dans le contexte
          updateUser({ mustChangePassword: true });
        }
      } catch (error) {
        console.error('Erreur vérification statut mot de passe:', error);
      } finally {
        setChecking(false);
      }
    };

    checkPasswordStatus();
  }, [isAuthenticated, user?.id]);

  const handlePasswordChanged = () => {
    // Mettre à jour le user pour indiquer que le mot de passe a été changé
    updateUser({ mustChangePassword: false });
    setMustChange(false);
    toast.success('Votre mot de passe a été changé avec succès !');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Si l'utilisateur doit changer son mot de passe, afficher uniquement le formulaire
  if (mustChange) {
    return <ForcePasswordChange onPasswordChanged={handlePasswordChanged} />;
  }

  // Sinon, afficher les enfants normalement
  return children;
};

export default PasswordChangeWrapper;
