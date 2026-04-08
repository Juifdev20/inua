import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Bell, Lock, Globe, Database, Save, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { useConfig } from '../../context/ConfigContext';
import { useApp } from '../../context/AppContext'; // <--- AJOUT : Import du contexte global
import { BACKEND_URL } from '../../config/environment.js';

const Settings = () => {
  const { refreshConfig } = useConfig();
  const { setAppName, setAppLogo } = useApp();
  const fileInputRef = useRef(null);
  
  // ✅ Configuration environnementale centralisée
    const API_BASE_URL = BACKEND_URL;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [settings, setSettings] = useState({
    // General
    appName: '',
    appDescription: '',
    timezone: '',
    language: '',
    logoUrl: '',
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    notifyOnNewUser: true,
    notifyOnSystemError: true,
    
    // Security
    sessionTimeout: 30,
    passwordExpiry: 90,
    twoFactorAuth: false,
    loginAttempts: 3,
    
    // Database
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      setSettings(prev => ({ ...prev, ...data }));
      
      // Si un logo existe déjà, on prépare la prévisualisation avec l'URL du backend
      if (data.logoUrl) {
        setLogoPreview(`${API_BASE_URL}${data.logoUrl}`);
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur", { description: "Impossible de charger les paramètres" });
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire de sélection de fichier
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Limite 2MB
        toast.error("Fichier trop volumineux", { description: "Le logo ne doit pas dépasser 2Mo" });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Utilisation de FormData pour l'upload (Impératif pour le Multipart backend)
      const formData = new FormData();
      
      // On construit l'objet de données à envoyer
      const configData = {
        appName: settings.appName,
        appDescription: settings.appDescription,
        timezone: settings.timezone,
        language: settings.language,
        sessionTimeout: settings.sessionTimeout,
        allowSelfRegistration: true // Ajouté pour correspondre à l'entité si nécessaire
      };

      // Ajout des réglages sous forme de Blob JSON (clé "settings" attendue par @RequestPart)
      formData.append('settings', new Blob([JSON.stringify(configData)], {
        type: 'application/json'
      }));

      // Ajout du fichier image s'il y en a un (clé "logo" attendue par @RequestPart)
      if (selectedFile) {
        formData.append('logo', selectedFile);
      }

      await axios.put(`${API_BASE_URL}/api/admin/settings`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // --- AJOUTS POUR LA MISE À JOUR SYNCHRONE ---
      setAppName(settings.appName); // Met à jour le nom partout (Login, Landing, Navbar)
      if (logoPreview) {
        setAppLogo(logoPreview); // Met à jour le logo partout
      }
      // --------------------------------------------

      // Crucial : Rafraîchir le contexte global pour mettre à jour la Sidebar immédiatement
      await refreshConfig();
      
      toast.success('Paramètres sauvegardés', {
        description: 'Le nom et le logo ont été mis à jour avec succès.'
      });
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur de sauvegarde", { description: "Impossible de mettre à jour les réglages." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Chargement de la configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-space-grotesk font-bold text-foreground mb-2">
          Paramètres Système
        </h1>
        <p className="text-muted-foreground">
          Configurez les paramètres globaux et l'identité visuelle de l'hôpital
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="general" className="gap-2">
            <Globe className="w-4 h-4" /> Général
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" /> Sécurité
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="w-4 h-4" /> Base de données
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identité de l'Hôpital</CardTitle>
              <CardDescription>Logo et informations de visibilité</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Zone Upload Logo */}
              <div className="flex flex-col sm:flex-row items-start gap-6 pb-4">
                <div className="flex flex-col items-center gap-3">
                  <Label>Logo de l'établissement</Label>
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden bg-muted/30">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                      )}
                    </div>
                    <Button 
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute -bottom-2 -right-2 rounded-full shadow-md hover:bg-primary hover:text-white transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <p className="text-[10px] text-muted-foreground">PNG, JPG (Max 2Mo)</p>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="appName">Nom de l'application (Hôpital)</Label>
                    <Input
                      id="appName"
                      value={settings.appName}
                      placeholder="Ex: Hôpital Central"
                      onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appDescription">Description ou Slogan</Label>
                    <Input
                      id="appDescription"
                      value={settings.appDescription}
                      placeholder="Ex: Excellence en soins médicaux"
                      onChange={(e) => setSettings({ ...settings, appDescription: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select value={settings.timezone} onValueChange={(value) => setSettings({ ...settings, timezone: value })}>
                    <SelectTrigger><SelectValue placeholder="Choisir un fuseau" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Kinshasa">Africa/Kinshasa (GMT+1)</SelectItem>
                      <SelectItem value="Africa/Lagos">Africa/Lagos (GMT+1)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (GMT+2)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Langue</Label>
                  <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
                    <SelectTrigger><SelectValue placeholder="Choisir une langue" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Notifications</CardTitle>
              <CardDescription>Gérez comment vous souhaitez être notifié</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications Email</Label>
                  <p className="text-sm text-muted-foreground">Recevoir des notifications par email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications SMS</Label>
                  <p className="text-sm text-muted-foreground">Recevoir des notifications par SMS</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications Push</Label>
                  <p className="text-sm text-muted-foreground">Recevoir des notifications push</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Sécurité</CardTitle>
              <CardDescription>Configurez les options de sécurité</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Durée de session (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Authentification à deux facteurs</Label>
                  <p className="text-sm text-muted-foreground">Activer la 2FA pour tous</p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Base de Données</CardTitle>
              <CardDescription>Sauvegardes et maintenance </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sauvegarde automatique</Label>
                  <p className="text-sm text-muted-foreground">Activer les sauvegardes</p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Fréquence</Label>
                <Select value={settings.backupFrequency} onValueChange={(value) => setSettings({ ...settings, backupFrequency: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Quotidienne</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-600 font-medium mb-2">Zone de maintenance</p>
                <Button variant="outline" className="border-yellow-600 text-yellow-600 hover:bg-yellow-500/10 w-full sm:w-auto">
                  Lancer une sauvegarde manuelle
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 gap-2 shadow-lg min-w-[220px]"
          size="lg"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;