import { createContext, useContext, useState, useEffect } from "react";
import authAPI from "../services/authAPI";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser && storedUser !== "undefined" && storedUser !== "null") {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Erreur d'initialisation Auth:", error);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  /* ===================== LOGIN ===================== */
  const login = async (credentials) => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const response = await authAPI.login(credentials);
      // Support de la structure Spring Boot data.data ou data directe
      const responseData = response.data?.data || response.data;
      const userFromApi = responseData.user;
      const tokenFromApi = responseData.accessToken || responseData.token;

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
        // ✅ NOUVEAUX CHAMPS POUR LES PRÉFÉRENCES
        notificationEnabled: userFromApi.notificationEnabled !== undefined ? userFromApi.notificationEnabled : true,
        soundEnabled: userFromApi.soundEnabled !== undefined ? userFromApi.soundEnabled : true,
        preferredLanguage: userFromApi.preferredLanguage || "fr"
      };

      localStorage.setItem("token", tokenFromApi);
      localStorage.setItem("user", JSON.stringify(userData));
      
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
        preferredLanguage: getVal(updatedFields.preferredLanguage, prevUser.preferredLanguage)
      };

      localStorage.setItem("user", JSON.stringify(newUser));
      return newUser; 
    });
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

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
  };

  // ✅ Cette fonction est utilisée par les ProtectedRoutes (AdminRoute, ReceptionRoute)
  const getSafeRole = () => {
    if (!user || !user.role) return "GUEST";
    // On retourne le rôle déjà nettoyé présent dans l'objet user
    return String(user.role).toUpperCase().trim();
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);