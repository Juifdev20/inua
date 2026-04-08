import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Bell, Globe, Camera, Loader2, Check, AlertCircle, Volume2, VolumeX, X } from 'lucide-react';
import authAPI from '@/services/authAPI';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Toast interne simple
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={cn("fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2", type === 'success' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
      {type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80"><X className="w-4 h-4" /></button>
    </div>
  );
};

export const Settings = () => {
  useTheme();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  // Toast interne
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState('fr');
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phoneNumber || '');
      setEmail(user.email || '');
      setNotificationEnabled(user.notificationEnabled !== undefined ? user.notificationEnabled : true);
      setSoundEnabled(user.soundEnabled !== undefined ? user.soundEnabled : true);
      setPreferredLanguage(user.preferredLanguage || 'fr');
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          showToast("Notifications activées - Vous recevrez des popups de bureau");
        } else {
          showToast("Permissions refusées - Notifications bloquées", "error");
        }
      } catch (error) {
        console.error('Erreur demande permission notification:', error);
      }
    }
  };

  const getAvatarUrl = (useCacheBusting = false) => {
    const timestamp = useCacheBusting ? `?t=${new Date().getTime()}` : '';
    if (avatarPreview) return avatarPreview + timestamp;
    if (!user?.photoUrl) return null;
    if (user.photoUrl.startsWith('data:') || user.photoUrl.startsWith('http')) return user.photoUrl + timestamp;
    if (user.photoUrl.startsWith('/uploads')) return `${BACKEND_URL}${user.photoUrl}${timestamp}`;
    return `${BACKEND_URL}/uploads/avatars/${user.photoUrl}${timestamp}`;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    try {
      const response = await authAPI.uploadAvatar(file);
      if (response.data?.success) {
        updateUser({ photoUrl: response.data.photoUrl });
        setAvatarPreview(null);
        setProfileMessage({ type: 'success', text: 'Avatar mis à jour avec succès!' });
      } else {
        setProfileMessage({ type: 'error', text: response.data?.error || 'Erreur lors de l\'upload' });
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'Erreur lors de l\'upload de l\'avatar' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMessage(null);
    try {
      const response = await authAPI.updateReceptionProfile({ firstName, lastName, phoneNumber: phone });
      if (response.data?.success) {
        updateUser({ firstName: response.data.user.firstName, lastName: response.data.user.lastName, phoneNumber: response.data.user.phoneNumber });
        setProfileMessage({ type: 'success', text: 'Profil mis à jour avec succès!' });
      } else {
        setProfileMessage({ type: 'error', text: response.data?.error || 'Erreur lors de la mise à jour' });
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (!oldPassword || !newPassword || !confirmPassword) { setPasswordError('Veuillez remplir tous les champs'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Les nouveaux mots de passe ne sont pas identiques.'); return; }
    if (newPassword.length < 6) { setPasswordError('Le mot de passe doit contenir au moins 6 caractères'); return; }
    if (oldPassword === newPassword) { setPasswordError('Le nouveau mot de passe doit être différent de l\'ancien'); return; }
    setLoadingPassword(true);
    try {
      const response = await authAPI.changePassword(oldPassword, newPassword);
      if (response.data?.success) {
        setPasswordSuccess(true);
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 5000);
      } else {
        setPasswordError(response.data?.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) setPasswordError('L\'ancien mot de passe saisi est incorrect.');
      else setPasswordError('Erreur lors du changement de mot de passe');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePreferenceChange = async (key, value) => {
    if (key === 'notificationEnabled') {
      setNotificationEnabled(value);
      if (value && Notification.permission === 'default') await requestNotificationPermission();
    } else if (key === 'soundEnabled') setSoundEnabled(value);
    else if (key === 'preferredLanguage') setPreferredLanguage(value);

    setLoadingPreferences(true);
    try {
      const response = await authAPI.updatePreferences(
        key === 'notificationEnabled' ? value : notificationEnabled,
        key === 'soundEnabled' ? value : soundEnabled,
        key === 'preferredLanguage' ? value : preferredLanguage
      );
      if (response.data?.success) {
        updateUser({
          notificationEnabled: key === 'notificationEnabled' ? value : notificationEnabled,
          soundEnabled: key === 'soundEnabled' ? value : soundEnabled,
          preferredLanguage: key === 'preferredLanguage' ? value : preferredLanguage
        });
        showToast("✅ Préférence mise à jour - " + getPreferenceSuccessMessage(key));
      }
    } catch (error) {
      showToast("Erreur - Impossible de sauvegarder la préférence", "error");
    } finally {
      setLoadingPreferences(false);
    }
  };

  const getPreferenceSuccessMessage = (key) => {
    switch (key) {
      case 'notificationEnabled': return "Les notifications de bureau sont maintenant activées";
      case 'soundEnabled': return "Les notifications sonores sont maintenant activées";
      case 'preferredLanguage': return preferredLanguage === 'fr' ? "Langue définie sur Français" : "Language set to English";
      default: return "Préférence mise à jour";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className={cn('text-3xl font-bold text-foreground')}>Paramètres</h1>

      <div className={cn('rounded-2xl shadow-lg p-6 bg-card border border-border')}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-medical-green/10"><User className="w-6 h-6 text-medical-green" /></div>
          <h2 className={cn('text-xl font-bold text-foreground')}>Profil</h2>
        </div>
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/20 bg-muted">
              {getAvatarUrl(true) ? (
                <img src={getAvatarUrl(true)} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-500/10"><User className="w-10 h-10 text-emerald-500" /></div>
              )}
              {uploadingAvatar && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-emerald-600" disabled={uploadingAvatar}>
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <div><p className={cn('font-medium text-foreground')}>Photo de profil</p><p className={cn('text-sm text-muted-foreground')}>Cliquez sur l'icône pour modifier</p></div>
        </div>
        {profileMessage && (
          <div className={cn('mb-4 p-3 rounded-lg flex items-center gap-2', profileMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600')}>
            {profileMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{profileMessage.text}
          </div>
        )}
        <form onSubmit={handleSaveProfile}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label htmlFor="firstName">Prénom</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="lastName">Nom</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="phone">Téléphone</Label><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} disabled className="rounded-xl bg-muted" /></div>
          </div>
          <div className="flex justify-end mt-6"><Button type="submit" className="rounded-xl px-6" disabled={loadingProfile}>{loadingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : 'Sauvegarder les modifications'}</Button></div>
        </form>
      </div>

      <div className={cn('rounded-2xl shadow-lg p-6 bg-card border border-border')}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-medical-orange/10"><Lock className="w-6 h-6 text-medical-orange" /></div>
          <h2 className={cn('text-xl font-bold text-foreground')}>Sécurité</h2>
        </div>
        {passwordSuccess && <div className="mb-4 p-3 rounded-lg flex items-center gap-2 bg-emerald-500/10 text-emerald-600"><Check className="w-4 h-4" />✅ Votre mot de passe a été mis à jour avec succès.</div>}
        {passwordError && <div className="mb-4 p-3 rounded-lg flex items-center gap-2 bg-rose-500/10 text-rose-600"><AlertCircle className="w-4 h-4" />{passwordError}</div>}
        <form onSubmit={handleChangePassword} autoComplete="off">
          <div className="space-y-4 max-w-md">
            <div className="space-y-2"><Label htmlFor="oldPassword">Ancien mot de passe</Label><Input id="oldPassword" type="password" autoComplete="new-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="newPassword">Nouveau mot de passe</Label><Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmer le mot de passe</Label><Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl" /></div>
          </div>
          <div className="flex justify-end mt-6"><Button type="submit" variant="outline" className="rounded-xl px-6" disabled={loadingPassword}>{loadingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Traitement...</> : 'Mettre à jour'}</Button></div>
        </form>
      </div>

      <div className={cn('rounded-2xl shadow-lg p-6 bg-card border border-border')}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-medical-blue/10"><Bell className="w-6 h-6 text-medical-blue" /></div>
          <h2 className={cn('text-xl font-bold text-foreground')}>Notifications</h2>
          {loadingPreferences && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        {notificationPermission === 'default' && notificationEnabled && <div className="mb-4 p-3 rounded-lg bg-amber-500/10 text-amber-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span className="text-sm">Cliquez pour autoriser les popups de bureau</span></div>}
        {notificationPermission === 'denied' && <div className="mb-4 p-3 rounded-lg bg-rose-500/10 text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span className="text-sm">Notifications bloquées. Veuillez les autoriser dans les paramètres du navigateur.</span></div>}
        <div className="space-y-6">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <Bell className={cn("w-5 h-5", notificationEnabled ? "text-medical-blue" : "text-muted-foreground")} />
              <div><p className={cn('font-medium text-foreground')}>Notifications de bureau</p><p className={cn('text-sm text-muted-foreground')}>Recevoir des notifications push sur le bureau</p></div>
            </div>
            <button onClick={() => handlePreferenceChange('notificationEnabled', !notificationEnabled)} className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", notificationEnabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600")} disabled={loadingPreferences}>
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", notificationEnabled ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50">
            <div className="flex items-center gap-3">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-medical-blue" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              <div><p className={cn('font-medium text-foreground')}>Notifications sonores</p><p className={cn('text-sm text-muted-foreground')}>Jouer un son lors d'une nouvelle notification</p></div>
            </div>
            <button onClick={() => handlePreferenceChange('soundEnabled', !soundEnabled)} className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", soundEnabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600")} disabled={loadingPreferences}>
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", soundEnabled ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
        </div>
      </div>

      <div className={cn('rounded-2xl shadow-lg p-6 bg-card border border-border')}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-medical-purple/10"><Globe className="w-6 h-6 text-medical-purple" /></div>
          <h2 className={cn('text-xl font-bold text-foreground')}>Langue</h2>
        </div>
        <select value={preferredLanguage} onChange={(e) => handlePreferenceChange('preferredLanguage', e.target.value)} className={cn('w-full md:w-64 rounded-xl px-4 py-3 bg-background border-2 border-border text-foreground focus:border-medical-green focus:outline-none')} disabled={loadingPreferences}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
        <p className={cn('text-sm text-muted-foreground mt-2')}>La langue sera persistée en base de données et mémorisée à chaque connexion</p>
      </div>
    </div>
  );
};

