import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const OAuth2Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithOAuth2 } = useAuth();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // ★ Éviter les appels multiples (boucle infinie)
    if (hasProcessedRef.current) return;
    
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const provider = searchParams.get('provider');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Erreur OAuth2', {
        description: error === 'oauth_user_not_found'
          ? 'Utilisateur non trouvé. Veuillez créer un compte d\'abord.'
          : 'Une erreur est survenue lors de l\'authentification.',
      });
      navigate('/login');
      return;
    }

    if (accessToken && refreshToken) {
      hasProcessedRef.current = true; // ★ Marquer comme traité
      // Stocker les tokens et rediriger
      loginWithOAuth2({ accessToken, refreshToken, provider, navigate });
    } else {
      // Pas de tokens - rediriger vers login
      toast.error('Authentification annulée', {
        description: 'Vous avez annulé la connexion via ' + provider,
      });
      navigate('/login');
    }
  }, []); // ★ Dépendances vides - exécution unique au montage

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">Connexion en cours...</p>
    </div>
  );
};

export default OAuth2Callback;
