import React, { useState } from 'react';
import { UserRound, Settings2, ShieldCheck, Save } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const LabSettings = () => {
  const [profile, setProfile] = useState({
    fullName: 'Technicien Labo',
    email: 'labo@hospital.com',
    phone: '+243 000 000 000',
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

  const saveAll = () => {
    toast.success('Paramètres enregistrés (starter mock)', {
      description: 'Brancher l’API profile/settings ensuite.',
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

            <div className="space-y-1">
              <Label>Nom complet</Label>
              <Input
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Préférences */}
        <Card className="xl:col-span-1">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h3 className="font-bold">Préférences</h3>
            </div>

            <div className="flex items-center justify-between">
              <Label>Notifications desktop</Label>
              <Switch
                checked={prefs.notifDesktop}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, notifDesktop: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Son des notifications</Label>
              <Switch
                checked={prefs.notifSound}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, notifSound: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto-refresh file d’attente</Label>
              <Switch
                checked={prefs.autoRefreshQueue}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, autoRefreshQueue: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Synchroniser mode sombre</Label>
              <Switch
                checked={prefs.darkModeSync}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, darkModeSync: v }))}
              />
            </div>
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