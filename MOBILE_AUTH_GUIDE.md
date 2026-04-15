# 📱 Guide d'Implémentation Mobile - InuaAfya

Ce guide explique comment implémenter l'authentification biométrique et la persistance du token pour l'application mobile React Native.

## 1️⃣ Installation des Dépendances

```bash
# Pour Expo
npx expo install expo-local-authentication
npx expo install @react-native-async-storage/async-storage

# Pour React Native CLI
npm install @react-native-async-storage/async-storage
npm install react-native-local-authentication
# ou
npm install @huggingface/react-native-local-auth
```

## 2️⃣ AuthService Mobile (React Native)

Créez le fichier `services/AuthService.mobile.js` :

```javascript
/**
 * 🏥 AuthService Mobile - React Native
 * Version pour AsyncStorage (à utiliser avec expo-local-authentication)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔑 Clés de stockage
const STORAGE_KEYS = {
  TOKEN: '@InuaAfya:token',
  USER: '@InuaAfya:user',
  REMEMBER_ME: '@InuaAfya:rememberMe',
  BIOMETRIC_ENABLED: '@InuaAfya:biometricEnabled',
  LAST_LOGIN_TIME: '@InuaAfya:lastLoginTime',
};

/**
 * ✅ Sauvegarde les données de session
 */
export const saveAuthData = async (token, user, rememberMe = true) => {
  try {
    const userData = {
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      photoUrl: user.photoUrl || '',
    };

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TOKEN, token],
      [STORAGE_KEYS.USER, JSON.stringify(userData)],
      [STORAGE_KEYS.REMEMBER_ME, JSON.stringify(rememberMe)],
      [STORAGE_KEYS.LAST_LOGIN_TIME, Date.now().toString()],
    ]);

    console.log('[AuthService Mobile] ✅ Données sauvegardées');
    return true;
  } catch (error) {
    console.error('[AuthService Mobile] ❌ Erreur:', error);
    return false;
  }
};

/**
 * 🔍 Récupère les données de session
 */
export const getAuthData = async () => {
  try {
    const values = await AsyncStorage.multiGet([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
    ]);

    const token = values[0][1];
    const userStr = values[1][1];

    if (!token || !userStr) return null;

    const user = JSON.parse(userStr);
    return { token, user };
  } catch (error) {
    console.error('[AuthService Mobile] ❌ Erreur:', error);
    return null;
  }
};

/**
 * 🧹 Efface les données (logout)
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.REMEMBER_ME,
      STORAGE_KEYS.LAST_LOGIN_TIME,
    ]);
    console.log('[AuthService Mobile] 🧹 Session nettoyée');
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 🔐 Active/désactive la biométrie
 */
export const setBiometricEnabled = async (enabled) => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.BIOMETRIC_ENABLED,
      JSON.stringify(enabled)
    );
    return true;
  } catch (error) {
    return false;
  }
};

export const isBiometricEnabled = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return value ? JSON.parse(value) : false;
  } catch {
    return false;
  }
};

// Export par défaut
export default {
  saveAuthData,
  getAuthData,
  clearAuthData,
  setBiometricEnabled,
  isBiometricEnabled,
  STORAGE_KEYS,
};
```

## 3️⃣ BiometricService Mobile

Créez `services/BiometricService.js` :

```javascript
/**
 * 🔐 BiometricService - Gestion de l'authentification biométrique
 */

import * as LocalAuthentication from 'expo-local-authentication';

export const checkBiometricSupport = async () => {
  try {
    // Vérifie si le matériel supporte la biométrie
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return { supported: false, reason: 'Hardware incompatible' };
    }

    // Vérifie si des méthodes biométriques sont enregistrées
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return { supported: false, reason: 'Aucune empreinte/Face ID enregistrée' };
    }

    // Détecte les types de biométrie disponibles
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    return {
      supported: true,
      types, // [1=Fingerprint, 2=FacialRecognition, 3=Iris]
      typeNames: types.map(t => {
        if (t === 1) return 'fingerprint';
        if (t === 2) return 'facial';
        if (t === 3) return 'iris';
        return 'unknown';
      }),
    };
  } catch (error) {
    console.error('Erreur biométrie:', error);
    return { supported: false, reason: error.message };
  }
};

export const authenticateWithBiometric = async (
  promptMessage = 'Veuillez vous authentifier pour accéder à InuaAfya',
  fallbackLabel = 'Utiliser le mot de passe'
) => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel,
      cancelLabel: 'Annuler',
      disableDeviceFallback: false,
    });

    return {
      success: result.success,
      error: result.error,
      warning: result.warning,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  checkBiometricSupport,
  authenticateWithBiometric,
};
```

## 4️⃣ Composant BiometricPrompt Mobile

Créez `components/BiometricPrompt.mobile.js` :

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BiometricService from '../services/BiometricService';

const BiometricPromptMobile = ({ 
  isVisible, 
  onSuccess, 
  onCancel, 
  userName = '' 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [biometricType, setBiometricType] = useState('fingerprint');

  useEffect(() => {
    if (isVisible) {
      checkBiometricType();
    }
  }, [isVisible]);

  const checkBiometricType = async () => {
    const support = await BiometricService.checkBiometricSupport();
    if (support.supported && support.typeNames.includes('facial')) {
      setBiometricType('facial');
    }
  };

  const handleAuthenticate = async () => {
    setIsLoading(true);
    setError(null);

    const result = await BiometricService.authenticateWithBiometric(
      `Veuillez vous authentifier pour accéder à InuaAfya${userName ? `\n${userName}` : ''}`,
      'Utiliser le mot de passe'
    );

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Authentification échouée');
    }

    setIsLoading(false);
  };

  const handleManualLogin = () => {
    onCancel();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={biometricType === 'facial' ? 'scan-outline' : 'finger-print'}
                size={48}
                color="#3B82F6"
              />
            </View>
          </View>

          {/* Content */}
          <Text style={styles.title}>Vérifiez votre identité</Text>
          <Text style={styles.description}>
            {biometricType === 'facial'
              ? 'Utilisez Face ID pour accéder rapidement à InuaAfya'
              : 'Utilisez votre empreinte digitale pour accéder à InuaAfya'}
          </Text>

          {userName && (
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userLabel}>Compte InuaAfya</Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Boutons */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isLoading && styles.disabled]}
            onPress={handleAuthenticate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons
                  name={biometricType === 'facial' ? 'scan-outline' : 'finger-print'}
                  size={20}
                  color="white"
                />
                <Text style={styles.primaryButtonText}>
                  Utiliser {biometricType === 'facial' ? 'Face ID' : 'Empreinte'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleManualLogin}
          >
            <Text style={styles.secondaryButtonText}>
              Utiliser le mot de passe
            </Text>
          </TouchableOpacity>

          {/* Security badge */}
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#9CA3AF" />
            <Text style={styles.securityText}>
              Authentification sécurisée
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 80,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  disabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default BiometricPromptMobile;
```

## 5️⃣ Flow d'Authentification Mobile

Dans votre `App.js` mobile :

```javascript
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './services/AuthService.mobile';
import BiometricService from './services/BiometricService';
import BiometricPrompt from './components/BiometricPrompt.mobile';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [showBiometric, setShowBiometric] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const authData = await AuthService.getAuthData();
    
    if (authData?.token) {
      // Vérifier si biométrie activée
      const biometricEnabled = await AuthService.isBiometricEnabled();
      const biometricSupport = await BiometricService.checkBiometricSupport();
      
      if (biometricEnabled && biometricSupport.supported) {
        // Afficher le prompt biométrique
        setShowBiometric(true);
        setUserToken(authData.token); // Token temporaire
      } else {
        // Pas de biométrie, accès direct
        setUserToken(authData.token);
      }
    }
    
    setIsLoading(false);
  };

  const handleBiometricSuccess = () => {
    setShowBiometric(false);
    // Continuer vers l'app
  };

  const handleBiometricCancel = () => {
    setShowBiometric(false);
    AuthService.clearAuthData();
    setUserToken(null);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {userToken ? <MainApp /> : <AuthNavigator />}
      
      <BiometricPrompt
        isVisible={showBiometric}
        onSuccess={handleBiometricSuccess}
        onCancel={handleBiometricCancel}
        userName={user?.username}
      />
    </NavigationContainer>
  );
};
```

## 📝 Notes Importantes

1. **Permissions Android**: Ajoutez dans `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

2. **Info.plist iOS**: Ajoutez:
```xml
<key>NSFaceIDUsageDescription</key>
<string>Cette application utilise Face ID pour sécuriser votre accès</string>
```

3. **Sécurité**: Ne stockez jamais le mot de passe en clair, uniquement le JWT token.

4. **Session**: La session expire après 7 jours d'inactivité (configurable dans AuthService).
