import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, Calendar, Shield, Save, Camera, Lock, 
  Loader2, Eye, EyeOff, CheckCircle2, XCircle 
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Separator } from '../../components/ui/separator';
import { useAuth } from '../../context/AuthContext'; 
import { toast } from "sonner";
import axios from 'axios';

// ✅ Configuration environnementale centralisée
import { BACKEND_URL } from '../../config/environment.js';
const API_BASE_URL = BACKEND_URL;

const Profile = () => {
  const { user, updateUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    prenom: user?.firstName || '',
    nom: user?.lastName || '',
    email: user?.email || '',
    telephone: user?.phoneNumber || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        prenom: user.firstName || '',
        nom: user.lastName || '',
        email: user.email || '',
        telephone: user.phoneNumber || ''
      });
    }
  }, [user]);

  const getCleanId = (id) => {
    if (!id) return null;
    const match = String(id).match(/^\d+/);
    return match ? match[0] : String(id).split(':')[0];
  };

  const getPasswordStrength = (password) => {
    if (!password) return 0;
    let score = 0;
    if (password.length > 7) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength(passwordData.newPassword);

  const handlePhotoClick = () => fileInputRef.current?.click();

  /* ===================== UPLOAD PHOTO (CORRIGÉ) ===================== */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image trop lourde (max 2MB)");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    const cleanId = getCleanId(user?.id);
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/upload-photo/${cleanId}`,
        formData,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      // ✅ Correction : On s'assure de récupérer la nouvelle URL
      const newPhotoName = response.data.photoUrl || response.data;
      
      // ✅ Mise à jour du contexte (déclenche le refresh Navbar)
      updateUser({ photoUrl: String(newPhotoName) });
      
      toast.success("Photo de profil mise à jour !");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Échec de l'upload");
    } finally {
      setUploading(false);
    }
  };

  /* ===================== UPDATE PROFIL (CORRIGÉ) ===================== */
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    const cleanId = getCleanId(user?.id);

    try {
      await axios.put(
        `${API_BASE_URL}/api/admin/update-profile/${cleanId}`, 
        profileData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // ✅ Correction : Synchronisation immédiate avec le Header
      updateUser({
        firstName: profileData.prenom,
        lastName: profileData.nom,
        email: profileData.email,
        phoneNumber: profileData.telephone
      });
      
      toast.success('Profil enregistré avec succès !');
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur de mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setPassLoading(true);
    try {
      const cleanId = getCleanId(user?.id);
      await axios.post(`${API_BASE_URL}/api/admin/change-password`, 
        { 
          adminId: cleanId, 
          currentPassword: passwordData.currentPassword, 
          newPassword: passwordData.newPassword 
        },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Mot de passe modifié avec succès');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Échec de la modification');
    } finally {
      setPassLoading(false);
    }
  };

  if (!user) return <div className="p-8 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Chargement...</div>;

  // ✅ Correction : Ajout d'un timestamp (?t=...) pour forcer le refresh de l'image (Cache-Busting)
  const photoUrl = user.photoUrl 
    ? `${API_BASE_URL}/uploads/profiles/${user.photoUrl}?t=${new Date().getTime()}` 
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mon Profil</h1>
        <p className="text-muted-foreground">Gérez vos informations et votre sécurité</p>
      </div>

      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-primary/10 overflow-hidden">
                {photoUrl ? (
                  <img 
                    key={user.photoUrl} // ✅ Force React à re-render l'image si le nom change
                    src={photoUrl} 
                    alt="Avatar" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <AvatarFallback className="bg-primary text-white text-2xl font-bold uppercase">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </Avatar>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <Button 
                size="icon" variant="secondary" onClick={handlePhotoClick} disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full shadow-lg border-2 border-background"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <Badge className="gap-1"><Shield className="w-3 h-3" /> {user.role || 'UTILISATEUR'}</Badge>
                <Badge variant="outline" className="gap-1"><Calendar className="w-3 h-3" /> Connecté</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reste du formulaire (Tabs) inchangé */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="personal" className="gap-2"><User className="w-4 h-4" /> Informations</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Lock className="w-4 h-4" /> Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Détails du compte</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input id="prenom" value={profileData.prenom} onChange={(e) => setProfileData({ ...profileData, prenom: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input id="nom" value={profileData.nom} onChange={(e) => setProfileData({ ...profileData, nom: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input id="telephone" value={profileData.telephone} onChange={(e) => setProfileData({ ...profileData, telephone: e.target.value })} required />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                    Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          {/* ... ton formulaire de mot de passe ... */}
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Changer le mot de passe</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <Label>Mot de passe actuel</Label>
                  <Input 
                    type="password" 
                    value={passwordData.currentPassword} 
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                    placeholder="Entrez votre mot de passe actuel"
                    required 
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={passwordData.newPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                      className="pr-10"
                      placeholder="Minimum 8 caractères"
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirmer le nouveau mot de passe</Label>
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={passwordData.confirmPassword} 
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                    required 
                  />
                </div>
                <Button type="submit" disabled={passLoading || strength < 50} className="w-full gap-2">
                  {passLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Mettre à jour la sécurité
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;