import React, { useState, useEffect, useRef } from 'react';
import { useHospitalConfig } from '../../hooks/useHospitalConfig';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Building2, MapPin, Phone, Mail, Globe, FileText, Palette, Settings, Save, Loader2, Image as ImageIcon, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const HospitalConfigForm = () => {
  const { config, loading, updateConfig } = useHospitalConfig();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const success = await updateConfig(formData);
    setSaving(false);
    if (success) {
      toast.success('Configuration enregistrée avec succès');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        {/* Onglets responsive : scrollable sur mobile, grille sur desktop */}
        <TabsList className="w-full flex flex-wrap sm:grid sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-1">
          <TabsTrigger value="general" className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Général</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Localisation</span>
            <span className="sm:hidden">Adresse</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <Phone className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Contact</span>
            <span className="sm:hidden">Tel</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Documents</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <Palette className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Apparence</span>
            <span className="sm:hidden">Style</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <Settings className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Système</span>
            <span className="sm:hidden">Sys</span>
          </TabsTrigger>
        </TabsList>

        {/* === ONGLET GÉNÉRAL === */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Informations de l'Hôpital
              </CardTitle>
              <CardDescription>
                Nom et identifiants de l'établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="hospitalName">Nom de l'Hôpital *</Label>
                <Input
                  id="hospitalName"
                  name="hospitalName"
                  value={formData.hospitalName || ''}
                  onChange={handleChange}
                  placeholder="Ex: INUA AFIA"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospitalCode">Code de l'Hôpital</Label>
                <Input
                  id="hospitalCode"
                  name="hospitalCode"
                  value={formData.hospitalCode || ''}
                  onChange={handleChange}
                  placeholder="Ex: HOSP-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ministryName">Ministère de tutelle</Label>
                <Input
                  id="ministryName"
                  name="ministryName"
                  value={formData.ministryName || ''}
                  onChange={handleChange}
                  placeholder="Ex: MINISTERE DE LA SANTE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentName">Département/Direction</Label>
                <Input
                  id="departmentName"
                  name="departmentName"
                  value={formData.departmentName || ''}
                  onChange={handleChange}
                  placeholder="Ex: DEPARTEMENT DE LA SANTE PUBLIQUE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zoneName">Zone/Secteur</Label>
                <Input
                  id="zoneName"
                  name="zoneName"
                  value={formData.zoneName || ''}
                  onChange={handleChange}
                  placeholder="Ex: ZONE RURALE DE BENI"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Logo de l'Hôpital</Label>
                
                {/* Prévisualisation du logo */}
                {logoPreview || formData.hospitalLogoUrl ? (
                  <div className="relative w-32 h-32 mb-4 rounded-lg border-2 border-dashed border-gray-300 p-2">
                    <img
                      src={logoPreview || formData.hospitalLogoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(null);
                        setFormData(prev => ({ ...prev, hospitalLogoUrl: '' }));
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 mb-4 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Vérifier la taille (max 2MB)
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error('Image trop grande', { description: 'Taille maximum : 2MB' });
                          return;
                        }
                        // Convertir en base64
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setLogoPreview(reader.result);
                          setFormData(prev => ({ ...prev, hospitalLogoUrl: reader.result }));
                          toast.success('Image chargée avec succès');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choisir une image
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formats acceptés : JPG, PNG, GIF. Taille max : 2MB. Le logo sera affiché sur toutes les fiches et documents.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ONGLET LOCALISATION === */}
        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Adresse et Localisation
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresse complète</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder="Ex: Boulevard du 30 Juin, Beni, RDC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  placeholder="Ex: BENI"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Région/Province</Label>
                <Input
                  id="region"
                  name="region"
                  value={formData.region || ''}
                  onChange={handleChange}
                  placeholder="Ex: NORD-KIVU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  placeholder="Ex: RÉPUBLIQUE DÉMOCRATIQUE DU CONGO"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code Postal</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode || ''}
                  onChange={handleChange}
                  placeholder="Ex: 0001"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ONGLET CONTACT === */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600" />
                Informations de Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Téléphone</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber || ''}
                  onChange={handleChange}
                  placeholder="+243 000 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="contact@inuafia.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Site Web</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website || ''}
                  onChange={handleChange}
                  placeholder="www.inuafia.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                Informations Légales
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="taxId">Numéro d'impôt</Label>
                <Input
                  id="taxId"
                  name="taxId"
                  value={formData.taxId || ''}
                  onChange={handleChange}
                  placeholder="TAX-000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">N° d'enregistrement</Label>
                <Input
                  id="registrationNumber"
                  name="registrationNumber"
                  value={formData.registrationNumber || ''}
                  onChange={handleChange}
                  placeholder="REG-000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">N° de licence</Label>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber || ''}
                  onChange={handleChange}
                  placeholder="LIC-000000"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ONGLET DOCUMENTS === */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                En-tête et Pied de page des documents
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="headerTitle">Titre de l'en-tête</Label>
                <Input
                  id="headerTitle"
                  name="headerTitle"
                  value={formData.headerTitle || ''}
                  onChange={handleChange}
                  placeholder="Ex: INUA AFIA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headerSubtitle">Sous-titre de l'en-tête</Label>
                <Input
                  id="headerSubtitle"
                  name="headerSubtitle"
                  value={formData.headerSubtitle || ''}
                  onChange={handleChange}
                  placeholder="Ex: Système de Gestion Hospitalière"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerText">Texte du pied de page</Label>
                <Input
                  id="footerText"
                  name="footerText"
                  value={formData.footerText || ''}
                  onChange={handleChange}
                  placeholder="Ex: © 2024 INUA AFIA - Tous droits réservés"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentWatermark">Filigrane des documents</Label>
                <Input
                  id="documentWatermark"
                  name="documentWatermark"
                  value={formData.documentWatermark || ''}
                  onChange={handleChange}
                  placeholder="Ex: CONFIDENTIEL"
                />
                <p className="text-xs text-muted-foreground">
                  Texte affiché en arrière-plan sur les documents (optionnel)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ONGLET APPARENCE === */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-600" />
                Couleurs et Options d'affichage
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Couleur principale</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    name="primaryColor"
                    type="color"
                    value={formData.primaryColor || '#059669'}
                    onChange={handleChange}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    name="primaryColor"
                    value={formData.primaryColor || ''}
                    onChange={handleChange}
                    placeholder="#059669"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    name="secondaryColor"
                    type="color"
                    value={formData.secondaryColor || '#065f46'}
                    onChange={handleChange}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    name="secondaryColor"
                    value={formData.secondaryColor || ''}
                    onChange={handleChange}
                    placeholder="#065f46"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <input
                  type="checkbox"
                  id="enableLogoOnDocuments"
                  name="enableLogoOnDocuments"
                  checked={formData.enableLogoOnDocuments || false}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="enableLogoOnDocuments" className="cursor-pointer">
                  Afficher le logo sur les documents
                </Label>
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <input
                  type="checkbox"
                  id="enableWatermark"
                  name="enableWatermark"
                  checked={formData.enableWatermark || false}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="enableWatermark" className="cursor-pointer">
                  Activer le filigrane
                </Label>
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <input
                  type="checkbox"
                  id="enableSignature"
                  name="enableSignature"
                  checked={formData.enableSignature || false}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="enableSignature" className="cursor-pointer">
                  Activer la signature sur les documents
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ONGLET SYSTÈME === */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                Configuration Système
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Code devise (ISO)</Label>
                <Input
                  id="currencyCode"
                  name="currencyCode"
                  value={formData.currencyCode || ''}
                  onChange={handleChange}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencySymbol">Symbole devise</Label>
                <Input
                  id="currencySymbol"
                  name="currencySymbol"
                  value={formData.currencySymbol || ''}
                  onChange={handleChange}
                  placeholder="$"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Langue par défaut</Label>
                <select
                  id="language"
                  name="language"
                  value={formData.language || 'fr'}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Input
                  id="timezone"
                  name="timezone"
                  value={formData.timezone || ''}
                  onChange={handleChange}
                  placeholder="Africa/Kinshasa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Format de date</Label>
                <Input
                  id="dateFormat"
                  name="dateFormat"
                  value={formData.dateFormat || ''}
                  onChange={handleChange}
                  placeholder="dd/MM/yyyy"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === BOUTON SAUVEGARDER === */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer la configuration
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default HospitalConfigForm;
