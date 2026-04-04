import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ReceptionRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Vérification des accès...</p>
      </div>
    );
  }

  // 🛡️ NORMALISATION DU RÔLE (Correction du bug de casse)
  // On transforme tout en MAJUSCULES et on enlève le préfixe "ROLE_" si présent
  const userRole = user?.role 
    ? String(user.role).toUpperCase().replace("ROLE_", "").trim() 
    : null;

  console.log("🛡️ [GUARD] Vérification accès Réception. Rôle détecté:", userRole);

  // Vérification flexible : accepte RECEPTION ou ADMIN
  const hasAccess = user && (userRole === 'RECEPTION' || userRole === 'ADMIN');

  if (!hasAccess) {
    console.warn("🚫 [GUARD] Accès refusé pour le rôle:", userRole);
    // Redirection vers login si non autorisé
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ReceptionRoute;