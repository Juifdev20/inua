import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Settings,
  Store,
  Clock,
  Bell,
  Users,
  Shield,
  Save,
  RefreshCw,
  Package,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  Clock3,
  Key,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { changePassword } from '../../services/pharmacyApi/pharmacyApi.js';

/* ═══════════════════════════════════════════════════════════════════════════
   PHARMACY SETTINGS - Page des paramètres pharmacie
   ═══════════════════════════════════════════════════════════════════════════ */

const COLORS = {
  primary: '#10B981',
  secondary: '#3B82F6',
  accent: '#8B5CF6',
  warning: '#F59E0B'
};

// Section card with collapsible content
const SettingsSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Card className="border-none shadow-sm bg-card mb-4">
      <CardHeader 
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${COLORS.primary}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: COLORS.primary }} />
            </div>
            <CardTitle className="text-base md:text-lg font-bold">{title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="p-4 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
};

// Form input group
const FormGroup = ({ label, children, description }) => (
  <div className="mb-4">
    <label className="block text-sm font-bold text-foreground mb-1">{label}</label>
    {children}
    {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: Pharmacy Settings
   ═══════════════════════════════════════════════════════════════════════════ */
const PharmacySettings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    // General Info
    pharmacyName: 'Pharmacie INUA AFIA',
    email: 'pharmacie@inuafia.com',
    phone: '+243 123 456 789',
    address: '123 Avenue de la Santé, Kinshasa',
    licenseNumber: 'PHARM-001-2024',
    
    // Opening Hours
    openingHours: {
      monday: { open: '08:00', close: '18:00', isOpen: true },
      tuesday: { open: '08:00', close: '18:00', isOpen: true },
      wednesday: { open: '08:00', close: '18:00', isOpen: true },
      thursday: { open: '08:00', close: '18:00', isOpen: true },
      friday: { open: '08:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '13:00', isOpen: true },
      sunday: { open: '09:00', close: '13:00', isOpen: false }
    },
    
    // Stock Thresholds
    stockThresholds: {
      criticalLevel: 10,
      lowLevel: 30,
      reorderPoint: 50
    },
    
    // Notifications
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      lowStockAlert: true,
      expiryAlert: true,
      orderCompleteAlert: true,
      dailySummary: false
    },
    
    // Security
    security: {
      requireApprovalForDiscount: true,
      maxDiscountPercent: 20,
      autoLogoutMinutes: 30,
      requirePinForRefund: true
    }
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Load settings from localStorage or API
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      // Try to load from localStorage first
      const saved = localStorage.getItem('pharmacy_settings');
      if (saved) {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
      // In a real app, you would also fetch from API
    } catch (err) {
      console.error('Error loading settings:', err);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      // Save to localStorage
      localStorage.setItem('pharmacy_settings', JSON.stringify(settings));
      // In a real app, you would also save to API
      // await savePharmacySettings(settings);
      setLastSaved(new Date());
      toast.success('Paramètres sauvegardés avec succès');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };
  
  // Update nested settings
  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };
  
  const updateOpeningHours = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [field]: value
        }
      }
    }));
  };
  
  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    strength = Object.values(checks).filter(Boolean).length;
    
    return {
      score: strength,
      checks,
      label: strength <= 2 ? 'Faible' : strength <= 3 ? 'Moyen' : strength === 4 ? 'Fort' : 'Très fort',
      color: strength <= 2 ? 'bg-red-500' : strength <= 3 ? 'bg-amber-500' : strength === 4 ? 'bg-emerald-500' : 'bg-emerald-600'
    };
  };
  
  // Handle password change
  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    const strength = calculatePasswordStrength(passwordData.newPassword);
    if (strength.score < 3) {
      toast.error('Le mot de passe est trop faible. Ajoutez des majuscules, chiffres et caractères spéciaux.');
      return;
    }
    
    try {
      setChangingPassword(true);
      // Call API to change password
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Mot de passe changé avec succès !');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Error changing password:', err);
      toast.error(err.response?.data?.error || 'Erreur lors du changement de mot de passe. Vérifiez votre mot de passe actuel.');
    } finally {
      setChangingPassword(false);
    }
  };
  
  const days = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' }
  ];
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none mb-2 md:mb-3 px-3 py-1 font-bold text-xs md:text-sm">
            <Settings className="w-3 h-3 mr-1" />
            CONFIGURATION
          </Badge>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Paramètres Pharmacie
          </h1>
          <p className="text-sm md:text-base text-muted-foreground font-medium mt-1">
            Gérez les informations et préférences de votre pharmacie
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <Button
            variant="outline"
            onClick={loadSettings}
            disabled={loading}
            className="rounded-xl font-bold"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Réinitialiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className={cn('w-4 h-4 mr-2', saving && 'animate-pulse')} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
      
      {/* Last saved indicator */}
      {lastSaved && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg w-fit">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          Dernière sauvegarde: {lastSaved.toLocaleTimeString()}
        </div>
      )}
      
      {/* General Information */}
      <SettingsSection title="Informations Générales" icon={Store}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label="Nom de la pharmacie">
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={settings.pharmacyName}
                onChange={(e) => setSettings(prev => ({ ...prev, pharmacyName: e.target.value }))}
                className="pl-10"
                placeholder="Nom de la pharmacie"
              />
            </div>
          </FormGroup>
          
          <FormGroup label="Numéro de licence">
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={settings.licenseNumber}
                onChange={(e) => setSettings(prev => ({ ...prev, licenseNumber: e.target.value }))}
                className="pl-10"
                placeholder="PHARM-XXX-XXXX"
              />
            </div>
          </FormGroup>
          
          <FormGroup label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                className="pl-10"
                placeholder="email@exemple.com"
              />
            </div>
          </FormGroup>
          
          <FormGroup label="Téléphone">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={settings.phone}
                onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                className="pl-10"
                placeholder="+243 XXX XXX XXX"
              />
            </div>
          </FormGroup>
          
          <FormGroup label="Adresse" className="md:col-span-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={settings.address}
                onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                className="pl-10"
                placeholder="Adresse complète"
              />
            </div>
          </FormGroup>
        </div>
      </SettingsSection>
      
      {/* Opening Hours */}
      <SettingsSection title="Heures d'Ouverture" icon={Clock}>
        <div className="space-y-3">
          {days.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="w-28 font-medium text-sm">{label}</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.openingHours[key].isOpen}
                  onChange={(e) => updateOpeningHours(key, 'isOpen', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm">Ouvert</span>
              </label>
              {settings.openingHours[key].isOpen && (
                <div className="flex items-center gap-2 ml-auto">
                  <div className="relative">
                    <Clock3 className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                      type="time"
                      value={settings.openingHours[key].open}
                      onChange={(e) => updateOpeningHours(key, 'open', e.target.value)}
                      className="pl-7 pr-2 py-1.5 text-sm border rounded-md bg-background"
                    />
                  </div>
                  <span className="text-muted-foreground">-</span>
                  <div className="relative">
                    <Clock3 className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                      type="time"
                      value={settings.openingHours[key].close}
                      onChange={(e) => updateOpeningHours(key, 'close', e.target.value)}
                      className="pl-7 pr-2 py-1.5 text-sm border rounded-md bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SettingsSection>
      
      {/* Stock Thresholds */}
      <SettingsSection title="Seuils de Stock" icon={Package}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormGroup 
            label="Niveau Critique (%)" 
            description="Alerte rouge en dessous de ce %"
          >
            <div className="relative">
              <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.stockThresholds.criticalLevel}
                onChange={(e) => updateSetting('stockThresholds', 'criticalLevel', parseInt(e.target.value) || 0)}
                className="pl-10"
              />
            </div>
          </FormGroup>
          
          <FormGroup 
            label="Niveau Faible (%)" 
            description="Alerte orange en dessous de ce %"
          >
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.stockThresholds.lowLevel}
                onChange={(e) => updateSetting('stockThresholds', 'lowLevel', parseInt(e.target.value) || 0)}
                className="pl-10"
              />
            </div>
          </FormGroup>
          
          <FormGroup 
            label="Point de Réapprovisionnement (%)" 
            description="Seuil pour générer une commande"
          >
            <div className="relative">
              <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.stockThresholds.reorderPoint}
                onChange={(e) => updateSetting('stockThresholds', 'reorderPoint', parseInt(e.target.value) || 0)}
                className="pl-10"
              />
            </div>
          </FormGroup>
        </div>
      </SettingsSection>
      
      {/* Notifications */}
      <SettingsSection title="Notifications" icon={Bell} defaultOpen={false}>
        <div className="space-y-3">
          {[
            { key: 'emailAlerts', label: 'Notifications par email', desc: 'Recevoir les alertes par email' },
            { key: 'smsAlerts', label: 'Notifications SMS', desc: 'Recevoir les alertes par SMS' },
            { key: 'lowStockAlert', label: 'Alerte stock faible', desc: 'Notifier quand le stock est faible' },
            { key: 'expiryAlert', label: 'Alerte péremption', desc: 'Notifier avant expiration des médicaments' },
            { key: 'orderCompleteAlert', label: 'Commande terminée', desc: 'Notifier quand une commande est prête' },
            { key: 'dailySummary', label: 'Résumé quotidien', desc: 'Envoyer un résumé des ventes chaque soir' }
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={settings.notifications[key]}
                onChange={(e) => updateSetting('notifications', key, e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </SettingsSection>
      
      {/* Security */}
      <SettingsSection title="Sécurité & Permissions" icon={Shield} defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label="Déconnexion automatique (minutes)">
            <Input
              type="number"
              min="5"
              max="120"
              value={settings.security.autoLogoutMinutes}
              onChange={(e) => updateSetting('security', 'autoLogoutMinutes', parseInt(e.target.value) || 30)}
            />
          </FormGroup>
          
          <FormGroup label="Réduction maximale autorisée (%)">
            <Input
              type="number"
              min="0"
              max="100"
              value={settings.security.maxDiscountPercent}
              onChange={(e) => updateSetting('security', 'maxDiscountPercent', parseInt(e.target.value) || 0)}
            />
          </FormGroup>
          
          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer md:col-span-2">
            <input
              type="checkbox"
              checked={settings.security.requireApprovalForDiscount}
              onChange={(e) => updateSetting('security', 'requireApprovalForDiscount', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <div className="font-medium text-sm">Approbation requise pour les réductions</div>
              <div className="text-xs text-muted-foreground">Nécessite une autorisation manager pour appliquer des réductions</div>
            </div>
          </label>
          
          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer md:col-span-2">
            <input
              type="checkbox"
              checked={settings.security.requirePinForRefund}
              onChange={(e) => updateSetting('security', 'requirePinForRefund', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <div className="font-medium text-sm">PIN requis pour les remboursements</div>
              <div className="text-xs text-muted-foreground">Nécessite un code PIN pour effectuer un remboursement</div>
            </div>
          </label>
        </div>
      </SettingsSection>
      
      {/* Password Change Section */}
      <SettingsSection title="Sécurité du Compte" icon={Key} defaultOpen={false}>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                Pour une sécurité optimale, utilisez un mot de passe d'au moins 8 caractères avec des majuscules, minuscules, chiffres et symboles.
              </p>
            </div>
          </div>
          
          {/* Current Password */}
          <FormGroup label="Mot de passe actuel">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="pl-10 pr-10"
                placeholder="Entrez votre mot de passe actuel"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </FormGroup>
          
          {/* New Password */}
          <FormGroup label="Nouveau mot de passe">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="pl-10 pr-10"
                placeholder="Entrez le nouveau mot de passe"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            
            {/* Password strength indicator */}
            {passwordData.newPassword && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Force du mot de passe</span>
                  <span className={cn(
                    'font-bold',
                    calculatePasswordStrength(passwordData.newPassword).score <= 2 ? 'text-red-600' : 
                    calculatePasswordStrength(passwordData.newPassword).score <= 3 ? 'text-amber-600' : 'text-emerald-600'
                  )}>
                    {calculatePasswordStrength(passwordData.newPassword).label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      calculatePasswordStrength(passwordData.newPassword).color
                    )}
                    style={{ width: `${(calculatePasswordStrength(passwordData.newPassword).score / 5) * 100}%` }}
                  />
                </div>
                
                {/* Password requirements checklist */}
                <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                  {[
                    { key: 'length', label: '8+ caractères', met: passwordData.newPassword.length >= 8 },
                    { key: 'uppercase', label: 'Majuscule (A-Z)', met: /[A-Z]/.test(passwordData.newPassword) },
                    { key: 'lowercase', label: 'Minuscule (a-z)', met: /[a-z]/.test(passwordData.newPassword) },
                    { key: 'number', label: 'Chiffre (0-9)', met: /\d/.test(passwordData.newPassword) },
                    { key: 'special', label: 'Symbole (!@#$%)', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) }
                  ].map(({ key, label, met }) => (
                    <div key={key} className={cn('flex items-center gap-1', met ? 'text-emerald-600' : 'text-muted-foreground')}>
                      <CheckCircle className={cn('w-3 h-3', met ? 'opacity-100' : 'opacity-40')} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </FormGroup>
          
          {/* Confirm Password */}
          <FormGroup label="Confirmer le nouveau mot de passe">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={cn(
                  'pl-10 pr-10',
                  passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && 'border-red-500 focus:border-red-500'
                )}
                placeholder="Confirmez le nouveau mot de passe"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </FormGroup>
          
          {/* Change Password Button */}
          <div className="pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword}
              className="w-full sm:w-auto rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
            >
              <Key className={cn('w-4 h-4 mr-2', changingPassword && 'animate-pulse')} />
              {changingPassword ? 'Changement en cours...' : 'Changer le mot de passe'}
            </Button>
          </div>
        </div>
      </SettingsSection>
      
      {/* Save button at bottom */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 px-8"
        >
          <Save className={cn('w-5 h-5 mr-2', saving && 'animate-pulse')} />
          {saving ? 'Sauvegarde en cours...' : 'Sauvegarder tous les paramètres'}
        </Button>
      </div>
    </div>
  );
};

export default PharmacySettings;
