import React, { useState, useEffect, useRef } from 'react';
import { UserRound, Settings2, ShieldCheck, Save, Lock, Camera, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';
import axios from '../../api/axios';
import { BACKEND_URL } from '../../config/environment';
import { useAuth } from '../../context/AuthContext';

// Helper pour construire l'URL complète de la photo
const getFullPhotoUrl = (photoUrl) => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${BACKEND_URL}${photoUrl}`;
};

const LabSettings = () => {
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    photoUrl: null,
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [prefs, setPrefs] = useState({
    notifDesktop: true,
    notifSound: true,
    autoRefreshQueue: true,
    darkModeSync: false,
  });

  const [admin, setAdmin] = useState({
    canValidate: true,
    canEditAfterValidation: false,
    requireDoubleCheck: true,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/me');
      if (response.data.success) {
        const user = response.data.data;
        setProfile({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          photoUrl: user.photoUrl || null,
        });
      }
    } catch (error) {
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const response = await axios.put('/api/users/me', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
      });
      if (response.data.success) {
        toast.success('Profil mis à jour avec succès');
        // Mettre à jour le contexte auth pour synchroniser le header
        updateUser({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phoneNumber: profile.phoneNumber,
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await axios.put('/api/users/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const newPhotoUrl = response.data.data.photoUrl;
        setProfile(prev => ({ ...prev, photoUrl: newPhotoUrl }));
        // Mettre à jour le contexte auth pour synchroniser le header
        updateUser({ photoUrl: newPhotoUrl });
        toast.success('Photo de profil mise à jour');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du téléchargement de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await axios.put('/api/users/me/password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.data.success) {
        toast.success('Mot de passe changé avec succès');
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  const saveAll = () => {
    saveProfile();
    toast.success('Paramètres enregistrés', {
      description: 'Vos préférences ont été sauvegardées.',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Paramètres profil & Administration</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
          Préférences personnelles et règles opérationnelles du laboratoire
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Profil */}
        <Card className="xl:col-span-1">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <UserRound className="w-4 h-4 text-primary" />
              <h3 className="font-bold">Profil</h3>
            </div>

            {/* Photo de profil */}
            <div className="flex flex-col items-center gap-3">
              <div
                onClick={handlePhotoClick}
                className="relative w-24 h-24 rounded-full bg-muted cursor-pointer overflow-hidden group"
              >
                {getFullPhotoUrl(profile.photoUrl) ? (
                  <img
                    src={getFullPhotoUrl(profile.photoUrl)}
                    alt="Profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <UserRound className="w-10 h-10 text-primary/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">Cliquez pour changer la photo</p>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label>Prénom</Label>
              <Input
                value={profile.firstName}
                onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <Label>Nom</Label>
              <Input
                value={profile.lastName}
                onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input
                value={profile.phoneNumber}
                onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))}
                disabled={loading}
              />
            </div>

            <Button
              onClick={saveProfile}
              disabled={saving || loading}
              className="w-full"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Mettre à jour le profil
            </Button>
          </CardContent>
        </Card>

        {/* Sécurité - Mot de passe */}
        <Card className="xl:col-span-1">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <h3 className="font-bold">Sécurité</h3>
            </div>

            <div className="space-y-1">
              <Label>Ancien mot de passe</Label>
              <Input
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, oldPassword: e.target.value }))}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <Label>Confirmer le mot de passe</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="••••••••"
              />
            </div>

            <Button
              onClick={handlePasswordChange}
              disabled={changingPassword || !passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              variant="outline"
              className="w-full"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>

        {/* Administration */}
        <Card className="xl:col-span-1">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-bold">Administration</h3>
            </div>

            <div className="flex items-center justify-between">
              <Label>Autoriser validation des résultats</Label>
              <Switch
                checked={admin.canValidate}
                onCheckedChange={(v) => setAdmin((a) => ({ ...a, canValidate: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Modifier après validation</Label>
              <Switch
                checked={admin.canEditAfterValidation}
                onCheckedChange={(v) => setAdmin((a) => ({ ...a, canEditAfterValidation: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Double vérification obligatoire</Label>
              <Switch
                checked={admin.requireDoubleCheck}
                onCheckedChange={(v) => setAdmin((a) => ({ ...a, requireDoubleCheck: v }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveAll} className="rounded-xl font-bold">
          <Save className="w-4 h-4 mr-2" />
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
};

export default LabSettings;
