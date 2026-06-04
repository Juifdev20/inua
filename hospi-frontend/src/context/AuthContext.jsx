import { createContext, useContext, useState, useEffect } from "react";
import authAPI from "../services/authAPI";
import AuthService from "../services/AuthService";
import { safeLocalStorageSet, safeLocalStorageGet } from "../utils/storagePersistence.js";
import { toast } from "sonner";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      try {
        // 🔥 Utilisation du AuthService pour récupérer les données
        const authData = AuthService.getAuthData();
        
        if (authData) {
          const { token: storedToken, user: storedUser } = authData;
          
          // Vérification expiration session (7 jours max)
          if (AuthService.isSessionExpired(168)) {
            console.warn("[Auth] Session expirée, reconnexion nécessaire");
            AuthService.clearAuthData();
          } else {
            setToken(storedToken);
            setUser(storedUser);
            console.log("[Auth] ✅ Session restaurée pour:", storedUser.username);
          }
        }
      } catch (error) {
        console.error("[Auth] ❌ Erreur d'initialisation:", error);
        AuthService.clearAuthData();
      } finally {
        setLoading(false);
      }
    };
    
    // Délai court pour s'assurer que localStorage est disponible (mobile PWA)
    const timer = setTimeout(initAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  /* ===================== LOGIN ===================== */
  const login = async (credentials, rememberMe = true) => {
    try {
      // Nettoyage préalable
      AuthService.clearAuthData();

      const response = await authAPI.login(credentials);
      // Support de la structure Spring Boot data.data ou data directe
      const responseData = response.data?.data || response.data;
      const userFromApi = responseData.user;
      const tokenFromApi = responseData.accessToken || responseData.token;
      const refreshTokenFromApi = responseData.refreshToken;

      if (!userFromApi || !tokenFromApi) {
        throw new Error("Réponse serveur incomplète");
      }

      // ✅ Normalisation robuste du rôle (Correction pour ROLE_RECEPTION)
      let rawRole = "PATIENT";
      if (userFromApi.role) {
        rawRole = typeof userFromApi.role === 'string' 
          ? userFromApi.role 
          : (userFromApi.role.nom || userFromApi.role.name || "PATIENT");
      }

      // On enlève "ROLE_", on passe en majuscules ET on nettoie les espaces invisibles (.trim())
      const normalizedRole = rawRole.toUpperCase().replace("ROLE_", "").trim();

      // ✅ Construction de l'objet User avec support du rôle RECEPTION
      const userData = {
        id: userFromApi.id,
        username: userFromApi.username,
        role: normalizedRole, // Stocké proprement (ex: "RECEPTION")
        email: userFromApi.email,
        firstName: userFromApi.firstName || userFromApi.prenom || "",
        lastName: userFromApi.lastName || userFromApi.nom || "",
        phoneNumber: userFromApi.phoneNumber || userFromApi.telephone || "",
        photoUrl: userFromApi.photoUrl || "",
        bloodType: userFromApi.bloodType || "",
        dateOfBirth: userFromApi.dateOfBirth || "",
        address: userFromApi.address || "",
        specialite: userFromApi.specialite || "",
        department: userFromApi.department || userFromApi.service || "",
        // ✅ CHAMP PATIENT ID POUR LE SYSTÈME IA
        patientId: userFromApi.patientId || userFromApi.patient?.id || null,
        // ✅ NOUVEAUX CHAMPS POUR LES PRÉFÉRENCES
        notificationEnabled: userFromApi.notificationEnabled !== undefined ? userFromApi.notificationEnabled : true,
        soundEnabled: userFromApi.soundEnabled !== undefined ? userFromApi.soundEnabled : true,
        preferredLanguage: userFromApi.preferredLanguage || "fr",
        // ✅ CHANGEMENT DE MOT DE PASSE OBLIGATOIRE
        mustChangePassword: userFromApi.mustChangePassword !== undefined ? userFromApi.mustChangePassword : false
      };

      // 🔥 Utilisation du AuthService pour sauvegarder (avec refresh token)
      AuthService.saveAuthData(tokenFromApi, userData, rememberMe, refreshTokenFromApi);
      
      setToken(tokenFromApi);
      setUser(userData);
      
      // ✅ On retourne les données pour que LoginPage puisse lire 'data.role'
      return { success: true, data: userData };
    } catch (error) {
      console.error("Erreur Login Context:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Identifiants incorrects.",
      };
    }
  };

  /* ===================== UPDATE USER PROFILE ===================== */
  const updateUser = (updatedFields) => {
    setUser((prevUser) => {
      if (!prevUser) return null;

      const getVal = (newVal, oldVal) => (newVal !== undefined && newVal !== null ? newVal : oldVal);

      const newUser = {
        ...prevUser,
        firstName: getVal(updatedFields.firstName || updatedFields.prenom, prevUser.firstName),
        lastName: getVal(updatedFields.lastName || updatedFields.nom, prevUser.lastName),
        phoneNumber: getVal(updatedFields.phoneNumber || updatedFields.telephone, prevUser.phoneNumber),
        photoUrl: getVal(updatedFields.photoUrl, prevUser.photoUrl),
        bloodType: getVal(updatedFields.bloodType, prevUser.bloodType),
        dateOfBirth: getVal(updatedFields.dateOfBirth, prevUser.dateOfBirth),
        address: getVal(updatedFields.address, prevUser.address),
        specialite: getVal(updatedFields.specialite, prevUser.specialite),
        department: getVal(updatedFields.department || updatedFields.service, prevUser.department),
        // ✅ NOUVEAUX CHAMPS POUR LES PRÉFÉRENCES
        notificationEnabled: getVal(updatedFields.notificationEnabled, prevUser.notificationEnabled),
        soundEnabled: getVal(updatedFields.soundEnabled, prevUser.soundEnabled),
        preferredLanguage: getVal(updatedFields.preferredLanguage, prevUser.preferredLanguage),
        // ✅ CHANGEMENT DE MOT DE PASSE OBLIGATOIRE
        mustChangePassword: getVal(updatedFields.mustChangePassword, prevUser.mustChangePassword)
      };

      safeLocalStorageSet("user", JSON.stringify(newUser));
      return newUser; 
    });
  };

  /* ===================== OAUTH2 ===================== */
  const loginWithOAuth2 = ({ accessToken, refreshToken, provider, navigate }) => {
    try {
      // Déchiffrer le token pour obtenir les infos utilisateur
      const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
      const userData = {
        id: tokenPayload.id,
        username: tokenPayload.sub,
        role: tokenPayload.role?.replace('ROLE_', '').toUpperCase() || 'PATIENT',
        email: tokenPayload.email,
        firstName: tokenPayload.firstName || '',
        lastName: tokenPayload.lastName || '',
      };

      // Stocker les tokens et les données utilisateur
      AuthService.saveAuthData(accessToken, userData, true, refreshToken);
      setToken(accessToken);
      setUser(userData);

      toast.success(`Connexion réussie via ${provider}`, {
        description: `Bienvenue, ${userData.firstName || userData.username} !`,
      });

      // Rediriger vers le dashboard approprié
      const role = userData.role.toUpperCase();
      const redirectMap = {
        SUPERADMIN: '/superadmin',
        SUPER_ADMIN: '/superadmin',
        ADMIN: '/admin/dashboard',
        RECEPTION: '/reception/dashboard',
        DOCTOR: '/doctor/dashboard',
        DOCTEUR: '/doctor/dashboard',
        FINANCE: '/finance/dashboard',
        CAISSIER: '/finance/dashboard',
        LABORATOIRE: '/laboratory/dashboard',
        LABO: '/laboratory/dashboard',
        PHARMACY: '/pharmacy/dashboard',
        PHARMACIE: '/pharmacy/dashboard',
      };
      const redirectPath = redirectMap[role] || '/patient/dashboard';
      navigate(redirectPath);
    } catch (error) {
      console.error('Erreur OAuth2:', error);
      toast.error('Erreur de connexion', {
        description: 'Impossible de traiter la connexion OAuth2',
      });
      navigate('/login');
    }
  };

  /* ===================== AUTRES FONCTIONS ===================== */
  const register = async (data) => {
    try {
      await authAPI.register(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur lors de l'inscription." };
    }
  };

  // ✅ NOUVELLE FONCTION: Mot de passe oublié
  const forgotPassword = async (email) => {
    try {
      const response = await authAPI.forgotPassword(email);
      const message = response.data?.message || "Email de réinitialisation envoyé";
      return { success: true, message };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Une erreur est survenue";
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    AuthService.clearAuthData();
    setUser(null);
    setToken(null);
    console.log("[Auth] 🚪 Déconnexion - session nettoyée");
  };

  // ✅ Cette fonction est utilisée par les ProtectedRoutes (AdminRoute, ReceptionRoute)
  const getSafeRole = () => {
    if (!user || !user.role) return "GUEST";
    // On retourne le rôle déjà nettoyé présent dans l'objet user
    return String(user.role).toUpperCase().trim();
  };

  // ✅ VÉRIFIE SI L'UTILISATEUR DOIT CHANGER SON MOT DE PASSE
  const mustChangePassword = () => {
    return user?.mustChangePassword === true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        role: getSafeRole(),
        loading,
        register,
        login,
        logout,
        updateUser,
        forgotPassword,
        loginWithOAuth2,
        mustChangePassword: mustChangePassword(),
        api: authAPI.api, // Exposer l'instance axios pour les appels API
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);