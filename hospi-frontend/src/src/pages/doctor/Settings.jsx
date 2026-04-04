import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Moon,
  Sun,
  Camera,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
const API = `${API_BASE_URL}/api`;

const Settings = () => {
  const { token, user, doctorProfile, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [settings, setSettings] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    specialite: '',
    service: '',
    numero_ordre: ''
  });

  // États pour la sécurité
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });

  // ✅ GESTION DES NOTIFICATIONS BUREAU
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // ✅ Fonction améliorée pour forcer l'affichage sur le bureau
  const triggerLocalNotification = (title, message) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const options = {
        body: message,
        icon: '/favicon.ico', 
        badge: '/favicon.ico',
        tag: 'new-update', // Évite les notifications en double
        requireInteraction: false // Permet à l'OS de gérer la fermeture
      };
      
      const notification = new Notification(title, options);
      
      notification.onclick = function() {
        window.focus();
        this.close();
      };
    }
  };

  // ✅ Fonction de test manuel pour valider l'affichage bureau
  const handleTestNotification = () => {
    if (!('Notification' in window)) {
      alert("Ce navigateur ne supporte pas les notifications.");
      return;
    }
    
    if (Notification.permission === 'granted') {
      triggerLocalNotification("Test de Notification", "Ceci est une alerte de bureau pour vos messages et rendez-vous.");
    } else {
      handleToggleNotifications(true);
    }
  };

  // ✅ LOGIQUE DE FORCE DU MOT DE PASSE
  const [strength, setStrength] = useState({ score: 0, label: '', color: 'bg-border' });

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (!password) return { score: 0, label: '', color: 'bg-border' };
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;

    const levels = [
      { label: 'Très faible', color: 'bg-red-500' },
      { label: 'Faible', color: 'bg-orange-500' },
      { label: 'Moyen', color: 'bg-yellow-500' },
      { label: 'Fort', color: 'bg-emerald-500' },
      { label: 'Excellent', color: 'bg-blue-500' }
    ];

    return { score, ...levels[score - 1] || levels[0] };
  };

  useEffect(() => {
    setStrength(checkPasswordStrength(passwordData.newPassword));
  }, [passwordData.newPassword]);

  const getFullImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\/?uploads\/?/, '');
    return `${API_BASE_URL}/uploads/${cleanPath}`;
  };

  useEffect(() => {
    if (user) {
      setSettings({
        nom: user.lastName || user.nom || '',
        prenom: user.firstName || user.prenom || '',
        email: user.email || '',
        telephone: user.phoneNumber || user.telephone || '',
        service: user.department || user.service || doctorProfile?.service || '',
        specialite: user.specialite || doctorProfile?.specialite || '',
        numero_ordre: doctorProfile?.numero_ordre || ''
      });
    }
  }, [user, doctorProfile]);

  // ✅ GESTION DU TOGGLE NOTIFICATION
  const handleToggleNotifications = async (checked) => {
    if (!('Notification' in window)) {
      alert("Ce navigateur ne supporte pas les notifications.");
      return;
    }

    if (checked) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        triggerLocalNotification("Système activé", "Vous recevrez désormais des alertes pour vos messages et rendez-vous.");
      } else {
        alert("Permission refusée. Veuillez autoriser les notifications dans les paramètres de votre navigateur.");
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatePayload = {
        id: user.id,
        lastName: settings.nom,
        firstName: settings.prenom,
        email: settings.email,
        phoneNumber: settings.telephone,
        department: settings.service,
        specialite: settings.specialite 
      };

      const response = await axios.put(`${API}/auth/update/${user.id}`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedUserData = response.data.data || response.data;
      if (updateUser && updatedUserData) {
        updateUser(updatedUserData);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert("Erreur lors de la sauvegarde : " + (error.response?.data?.message || "Problème serveur"));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Les mots de passe ne correspondent pas' });
      return;
    }
    if (strength.score < 3) {
      setPasswordStatus({ type: 'error', message: 'Le niveau de sécurité est insuffisant' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/v1/doctors/change-password`, {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPasswordStatus({ type: 'success', message: 'Mot de passe modifié avec succès' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordStatus({ type: 'error', message: error.response?.data || 'Erreur lors du changement' });
    } finally {
      setLoading(false);
      setTimeout(() => setPasswordStatus({ type: '', message: '' }), 4000);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await axios.post(`${API}/v1/doctors/me/photo`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data && (response.data.photoUrl || response.data.url)) {
        updateUser({ ...user, photoUrl: response.data.photoUrl || response.data.url });
      }
    } catch (error) {
      console.error("Erreur photo:", error);
      alert("Erreur lors de l'import.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => `${settings.prenom?.[0] || ''}${settings.nom?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-1" data-testid="doctor-settings">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-space-grotesk font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground font-medium">Gérez vos informations professionnelles et la sécurité de votre compte</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl border border-border inline-flex h-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2 rounded-lg px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <User className="w-4 h-4" /> Profil
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2 rounded-lg px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <SettingsIcon className="w-4 h-4" /> Interface
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 rounded-lg px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Shield className="w-4 h-4" /> Sécurité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0 space-y-6 animate-in fade-in-50 duration-300">
          <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Photo de profil</CardTitle>
              <CardDescription className="font-medium text-muted-foreground">Identité visuelle utilisée sur vos documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative group">
                  <Avatar className="w-28 h-28 border-4 border-background shadow-xl ring-1 ring-border">
                    <AvatarImage src={getFullImageUrl(user?.photoUrl || user?.avatar_url)} />
                    <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-1 right-1 w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 transition-all shadow-lg ring-2 ring-background group-hover:scale-110 cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                  </label>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="font-bold text-foreground text-2xl">Dr. {settings.prenom} {settings.nom}</h3>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                    <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-primary/20">{settings.specialite || 'Spécialiste'}</span>
                    <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full">Dpt: {settings.service || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Informations de contact & Cabinet</CardTitle>
              <CardDescription className="font-medium">Détails administratifs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="font-bold">Prénom</Label>
                  <Input id="prenom" value={settings.prenom} onChange={(e) => setSettings({ ...settings, prenom: e.target.value })} className="bg-background border-border rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom" className="font-bold">Nom</Label>
                  <Input id="nom" value={settings.nom} onChange={(e) => setSettings({ ...settings, nom: e.target.value })} className="bg-background border-border rounded-xl h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold">Email professionnel</Label>
                  <Input id="email" type="email" value={settings.email} readOnly className="bg-muted/50 border-border rounded-xl cursor-not-allowed h-11 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone" className="font-bold">Téléphone</Label>
                  <Input id="telephone" value={settings.telephone} onChange={(e) => setSettings({ ...settings, telephone: e.target.value })} className="bg-background border-border rounded-xl h-11" />
                </div>
              </div>
              <Separator className="bg-border/60" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="specialite" className="font-bold text-primary">Spécialité exercée</Label>
                  <Input id="specialite" value={settings.specialite} onChange={(e) => setSettings({ ...settings, specialite: e.target.value })} className="bg-background border-border rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service" className="font-bold text-primary">Service / Département</Label>
                  <Input id="service" value={settings.service} onChange={(e) => setSettings({ ...settings, service: e.target.value })} className="bg-background border-border rounded-xl h-11" placeholder="Nom du département" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end sticky bottom-6 z-10">
            <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-white shadow-xl min-w-[180px] h-12 rounded-xl text-md font-bold">
              {loading ? "Enregistrement..." : saved ? "Profil mis à jour" : "Sauvegarder"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-0 animate-in slide-in-from-right-5 duration-300">
          <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl">Préférences d'affichage</CardTitle>
              <CardDescription className="font-medium">Configurez l'apparence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-6">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                    {theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold text-lg text-foreground">Thème de l'interface</p>
                    <p className="text-sm text-muted-foreground">Alterner entre mode clair et mode sombre</p>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-6">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-foreground">Notifications Bureau</p>
                    <p className="text-sm text-muted-foreground">Alertes instantanées (Nouveau message, RDV)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleTestNotification}
                    className="h-8 text-xs font-bold border-primary text-primary hover:bg-primary/5"
                  >
                    Tester l'alerte
                  </Button>
                  <Switch 
                    checked={notificationsEnabled} 
                    onCheckedChange={handleToggleNotifications}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-0 animate-in slide-in-from-right-5 duration-300">
          <Card className="border-border bg-card shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Sécurité & Accès</CardTitle>
              <CardDescription className="font-medium">Renforcez la protection de vos données médicales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                {passwordStatus.message && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 animate-in zoom-in duration-300 ${passwordStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                    {passwordStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p className="text-sm font-bold">{passwordStatus.message}</p>
                  </div>
                )}

                <div className="grid gap-6 sm:max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Mot de passe actuel</Label>
                    <div className="relative">
                      <Input 
                        id="current-password" 
                        type={showOldPassword ? "text" : "password"} 
                        autoComplete="new-password"
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                        placeholder="Confirmez votre identité" 
                        className="rounded-xl h-11 pr-10" 
                      />
                      <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <input type="password" style={{display:'none'}} /> 
                    <Input id="new-password" type="password" autoComplete="new-password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} placeholder="Minimum 8 caractères" className="rounded-xl h-11" />
                    
                    {passwordData.newPassword && (
                      <div className="space-y-2 mt-3 animate-in slide-in-from-top-1">
                        <div className="flex justify-between items-center text-[11px] font-bold">
                          <span className="text-muted-foreground">Force du mot de passe :</span>
                          <span style={{ color: strength.color.replace('bg-', 'var(--') }}>{strength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <div key={lvl} className={`h-full flex-1 transition-all duration-500 ${lvl <= strength.score ? strength.color : 'bg-muted'}`} />
                          ))}
                        </div>
                        <ul className="text-[10px] text-muted-foreground grid grid-cols-2 gap-1 mt-2">
                          <li className={passwordData.newPassword.length >= 8 ? "text-emerald-500 flex items-center gap-1" : "flex items-center gap-1"}><CheckCircle2 className="w-3 h-3" /> 8+ caractères</li>
                          <li className={/[A-Z]/.test(passwordData.newPassword) ? "text-emerald-500 flex items-center gap-1" : "flex items-center gap-1"}><CheckCircle2 className="w-3 h-3" /> Majuscule</li>
                          <li className={/[0-9]/.test(passwordData.newPassword) ? "text-emerald-500 flex items-center gap-1" : "flex items-center gap-1"}><CheckCircle2 className="w-3 h-3" /> Chiffre</li>
                          <li className={/[^A-Za-z0-9]/.test(passwordData.newPassword) ? "text-emerald-500 flex items-center gap-1" : "flex items-center gap-1"}><CheckCircle2 className="w-3 h-3" /> Spécial</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                    <Input id="confirm-password" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} placeholder="Répétez le mot de passe" className="rounded-xl h-11" />
                  </div>

                  <Button onClick={handleChangePassword} disabled={loading || !passwordData.oldPassword || strength.score < 3 || passwordData.newPassword !== passwordData.confirmPassword} className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-11 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                    {loading ? "Mise à jour..." : "Confirmer le changement"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Session active</p>
                    <p className="text-xs text-muted-foreground mt-1">Vous êtes actuellement connecté sur ce navigateur. Pensez à vous déconnecter si vous utilisez un poste partagé au cabinet.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;