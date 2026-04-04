import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  User, Lock, Bell, Globe, Camera, Loader2, Check,
  AlertCircle, Volume2, VolumeX, X, Settings as SettingsIcon,
  Shield, Eye, EyeOff, ChevronRight, Save
} from 'lucide-react';
import authAPI from '@/services/authAPI';

const BACKEND_URL = 'http://localhost:8080';

/* ── Toast interne ── */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={cn(
      'fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300',
      type === 'success'
        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
        : 'bg-rose-500 text-white shadow-rose-500/30'
    )}>
      {type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="font-bold text-sm">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-70 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/* ── Sections config ── */
const SECTIONS = [
  { id: 'profile', label: 'Profil', icon: User, color: '#10B981' },
  { id: 'security', label: 'Sécurité', icon: Shield, color: '#F59E0B' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: '#3B82F6' },
  { id: 'language', label: 'Langue', icon: Globe, color: '#8B5CF6' },
];

export const Settings = () => {
  useTheme();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const [activeSection, setActiveSection] = useState('profile');

  /* ── Profile state ── */
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  /* ── Password state ── */
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  /* ── Avatar state ── */
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  /* ── Preferences state ── */
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState('fr');
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  /* ── Sync user data ── */
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

  /* ── Avatar helpers ── */
  const getAvatarUrl = (cacheBust = false) => {
    const ts = cacheBust ? `?t=${Date.now()}` : '';
    if (avatarPreview) return avatarPreview + ts;
    if (!user?.photoUrl) return null;
    if (user.photoUrl.startsWith('data:') || user.photoUrl.startsWith('http')) return user.photoUrl + ts;
    if (user.photoUrl.startsWith('/uploads')) return `${BACKEND_URL}${user.photoUrl}${ts}`;
    return `${BACKEND_URL}/uploads/avatars/${user.photoUrl}${ts}`;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    try {
      const response = await authAPI.uploadAvatar(file);
      if (response.data?.success) {
        updateUser({ photoUrl: response.data.photoUrl });
        setAvatarPreview(null);
        showToast('Avatar mis à jour');
      } else {
        showToast(response.data?.error || "Erreur lors de l'upload", 'error');
      }
    } catch {
      showToast("Erreur lors de l'upload", 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* ── Profile save ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMessage(null);
    try {
      const response = await authAPI.updateReceptionProfile({
        firstName, lastName, phoneNumber: phone,
      });
      if (response.data?.success) {
        updateUser({
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          phoneNumber: response.data.user.phoneNumber,
        });
        showToast('Profil mis à jour');
      } else {
        showToast(response.data?.error || 'Erreur', 'error');
      }
    } catch {
      showToast('Erreur mise à jour profil', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  /* ── Password change ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Veuillez remplir tous les champs'); return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas'); return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Minimum 6 caractères requis'); return;
    }
    if (oldPassword === newPassword) {
      setPasswordError("Le nouveau mot de passe doit être différent"); return;
    }

    setLoadingPassword(true);
    try {
      const response = await authAPI.changePassword(oldPassword, newPassword);
      if (response.data?.success) {
        setPasswordSuccess(true);
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        showToast('Mot de passe mis à jour');
        setTimeout(() => setPasswordSuccess(false), 5000);
      } else {
        setPasswordError(response.data?.error || 'Erreur');
      }
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        setPasswordError("L'ancien mot de passe est incorrect");
      } else {
        setPasswordError('Erreur serveur');
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  /* ── Preferences ── */
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        showToast(
          permission === 'granted'
            ? 'Notifications de bureau activées'
            : 'Permissions refusées',
          permission === 'granted' ? 'success' : 'error'
        );
      } catch (error) {
        console.error('Permission error:', error);
      }
    }
  };

  const handlePreferenceChange = async (key, value) => {
    if (key === 'notificationEnabled') {
      setNotificationEnabled(value);
      if (value && Notification.permission === 'default') await requestNotificationPermission();
    } else if (key === 'soundEnabled') {
      setSoundEnabled(value);
    } else if (key === 'preferredLanguage') {
      setPreferredLanguage(value);
    }

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
          preferredLanguage: key === 'preferredLanguage' ? value : preferredLanguage,
        });
        showToast('Préférence sauvegardée');
      }
    } catch {
      showToast('Erreur sauvegarde préférence', 'error');
    } finally {
      setLoadingPreferences(false);
    }
  };

  /* ── Toggle component ── */
  const Toggle = ({ enabled, onChange, disabled }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/30',
        enabled ? 'bg-emerald-500' : 'bg-muted-foreground/20'
      )}
    >
      <span className={cn(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
        enabled ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  );

  /* ═══ SECTION RENDERERS ═══ */
  const renderProfile = () => (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-border bg-muted transition-all group-hover:border-emerald-500/30">
            {getAvatarUrl(true) ? (
              <img
                src={getAvatarUrl(true)} alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-emerald-500/5">
                <User className="w-10 h-10 text-emerald-500/40" />
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 transition-all active:scale-90"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
        <div>
          <p className="font-black text-foreground text-lg">
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Votre profil'}
          </p>
          <p className="text-xs text-muted-foreground font-medium">{email}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wider font-bold">
            Cliquez sur l'icône pour modifier la photo
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSaveProfile} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Prénom</Label>
            <Input
              value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="rounded-xl h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Nom</Label>
            <Input
              value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="rounded-xl h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Téléphone</Label>
            <Input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email (non modifiable)
            </Label>
            <Input
              type="email" value={email} disabled
              className="rounded-xl h-12 bg-muted/50 cursor-not-allowed"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="submit" disabled={loadingProfile}
            className="rounded-xl h-12 px-8 font-bold bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {loadingProfile ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
            ) : (
              <><Save className="w-4 h-4" /> Sauvegarder</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase tracking-tight text-foreground mb-1">
          Changer le mot de passe
        </h3>
        <p className="text-xs text-muted-foreground">
          Votre mot de passe doit contenir au minimum 6 caractères.
        </p>
      </div>

      {passwordSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center gap-3 font-bold text-sm">
          <Check className="w-5 h-5" /> Mot de passe mis à jour avec succès
        </div>
      )}
      {passwordError && (
        <div className="p-4 rounded-xl bg-rose-500/10 text-rose-600 flex items-center gap-3 font-bold text-sm">
          <AlertCircle className="w-5 h-5" /> {passwordError}
        </div>
      )}

      <form onSubmit={handleChangePassword} autoComplete="off" className="space-y-5 max-w-md">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">Ancien mot de passe</Label>
          <div className="relative">
            <Input
              type={showOldPwd ? 'text' : 'password'}
              autoComplete="new-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="rounded-xl h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowOldPwd(!showOldPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">Nouveau mot de passe</Label>
          <div className="relative">
            <Input
              type={showNewPwd ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowNewPwd(!showNewPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Barre de force */}
          {newPassword && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((i) => {
                  const strength = newPassword.length >= 12 ? 4 : newPassword.length >= 8 ? 3 : newPassword.length >= 6 ? 2 : 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-all',
                        i <= strength
                          ? strength <= 1 ? 'bg-red-500' : strength <= 2 ? 'bg-amber-500' : strength <= 3 ? 'bg-emerald-400' : 'bg-emerald-500'
                          : 'bg-muted'
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">
                {newPassword.length >= 12 ? 'Excellent' : newPassword.length >= 8 ? 'Bon' : newPassword.length >= 6 ? 'Acceptable' : 'Faible'}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">Confirmer</Label>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={cn(
              'rounded-xl h-12',
              confirmPassword && confirmPassword !== newPassword && 'border-rose-500 focus:ring-rose-500/20'
            )}
          />
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-[10px] font-bold text-rose-500 mt-1">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit" variant="outline" disabled={loadingPassword}
            className="rounded-xl h-12 px-8 font-bold border-2 gap-2"
          >
            {loadingPassword ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</>
            ) : (
              <><Lock className="w-4 h-4" /> Mettre à jour</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase tracking-tight text-foreground mb-1">
          Préférences de notification
        </h3>
        <p className="text-xs text-muted-foreground">
          Configurez comment et quand vous recevez des alertes.
        </p>
      </div>

      {/* Alertes permissions */}
      {notificationPermission === 'denied' && (
        <div className="p-4 rounded-xl bg-rose-500/10 text-rose-600 flex items-center gap-3 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          Notifications bloquées par le navigateur. Autorisez-les dans les paramètres.
        </div>
      )}
      {notificationPermission === 'default' && notificationEnabled && (
        <button
          onClick={requestNotificationPermission}
          className="w-full p-4 rounded-xl bg-amber-500/10 text-amber-600 flex items-center gap-3 text-sm font-bold hover:bg-amber-500/15 transition-colors"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          Cliquez ici pour autoriser les notifications de bureau
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      )}

      <div className="space-y-2">
        {/* Notifications desktop */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              notificationEnabled ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'
            )}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Notifications de bureau</p>
              <p className="text-[11px] text-muted-foreground">Popups push sur votre écran</p>
            </div>
          </div>
          <Toggle
            enabled={notificationEnabled}
            onChange={() => handlePreferenceChange('notificationEnabled', !notificationEnabled)}
            disabled={loadingPreferences}
          />
        </div>

        {/* Son */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              soundEnabled ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'
            )}>
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Notifications sonores</p>
              <p className="text-[11px] text-muted-foreground">Son lors d'une nouvelle alerte</p>
            </div>
          </div>
          <Toggle
            enabled={soundEnabled}
            onChange={() => handlePreferenceChange('soundEnabled', !soundEnabled)}
            disabled={loadingPreferences}
          />
        </div>
      </div>

      {loadingPreferences && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sauvegarde en cours...
        </div>
      )}
    </div>
  );

  const renderLanguage = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase tracking-tight text-foreground mb-1">
          Langue de l'interface
        </h3>
        <p className="text-xs text-muted-foreground">
          Ce choix sera persisté et appliqué à chaque connexion.
        </p>
      </div>

      <div className="space-y-3 max-w-sm">
        {[
          { value: 'fr', label: 'Français', flag: '🇫🇷', sub: 'Interface en français' },
          { value: 'en', label: 'English', flag: '🇬🇧', sub: 'Interface in English' },
        ].map((lang) => (
          <button
            key={lang.value}
            onClick={() => handlePreferenceChange('preferredLanguage', lang.value)}
            disabled={loadingPreferences}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
              preferredLanguage === lang.value
                ? 'border-emerald-500 bg-emerald-500/5 shadow-sm'
                : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
            )}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">{lang.label}</p>
              <p className="text-[11px] text-muted-foreground">{lang.sub}</p>
            </div>
            {preferredLanguage === lang.value && (
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {loadingPreferences && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sauvegarde...
        </div>
      )}
    </div>
  );

  const sectionRenderers = {
    profile: renderProfile,
    security: renderSecurity,
    notifications: renderNotifications,
    language: renderLanguage,
  };

  /* ═══ RENDU ═══ */
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-foreground/5">
          <SettingsIcon className="w-7 h-7 text-foreground/70" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Paramètres</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
            Configuration du compte
          </p>
        </div>
      </div>

      {/* Layout : Nav latérale + Contenu */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Navigation latérale ── */}
        <Card className="lg:col-span-1 border-none shadow-sm bg-card rounded-2xl overflow-hidden h-fit">
          <CardContent className="p-3">
            <nav className="space-y-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left group',
                      isActive
                        ? 'bg-foreground/5 shadow-sm'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0',
                        isActive ? 'scale-105' : 'opacity-60 group-hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: isActive ? `${section.color}15` : 'transparent',
                        color: isActive ? section.color : undefined,
                      }}
                    >
                      <Icon className={cn(
                        'w-4.5 h-4.5',
                        !isActive && 'text-muted-foreground'
                      )} />
                    </div>
                    <span className={cn(
                      'font-bold text-sm transition-colors',
                      isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    )}>
                      {section.label}
                    </span>
                    <ChevronRight className={cn(
                      'w-4 h-4 ml-auto transition-all',
                      isActive
                        ? 'text-foreground/40 translate-x-0.5'
                        : 'text-transparent group-hover:text-muted-foreground/30'
                    )} />
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* ── Contenu de la section ── */}
        <Card className="lg:col-span-3 border-none shadow-sm bg-card rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            {/* Titre de section */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border/50">
              {(() => {
                const section = SECTIONS.find((s) => s.id === activeSection);
                const Icon = section.icon;
                return (
                  <>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${section.color}15`, color: section.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-black text-foreground">{section.label}</h2>
                  </>
                );
              })()}
            </div>

            {/* Contenu dynamique */}
            <div className="animate-in fade-in duration-300" key={activeSection}>
              {sectionRenderers[activeSection]?.()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};