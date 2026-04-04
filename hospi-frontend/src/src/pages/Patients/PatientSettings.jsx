import React, { useState } from 'react';
import { Lock, Bell, Shield, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const Settings = () => {
  // États pour les formulaires
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // États pour l'affichage (visibilité)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // État de chargement
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notifications, setNotifications] = useState({
    emailAppointments: true,
    emailDocuments: true,
    emailBilling: false,
    smsReminders: true,
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // 1. Validation de base
    if (newPassword !== confirmPassword) {
      return toast.error("La confirmation ne correspond pas au nouveau mot de passe.");
    }

    if (newPassword.length < 8) {
      return toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:8080/api/v1/patients/change-password', 
        {
          currentPassword,
          newPassword,
          confirmPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success("Sécurité mise à jour !", {
        description: "Votre mot de passe a été modifié avec succès."
      });

      // Reset du formulaire
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error("Erreur changement mdp:", error);
      const message = error.response?.data?.message || "Erreur lors de la modification.";
      toast.error("Échec de la mise à jour", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationChange = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    });
    // Optionnel : Envoyer les préférences au backend ici
  };

  return (
    <div data-testid="settings-page" className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">
          Paramètres du Compte
        </h1>
        <p className="text-muted-foreground">Gérez vos paramètres de sécurité et de notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Password Change */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">Changer le mot de passe</h2>
                <p className="text-sm text-muted-foreground">Mettez à jour votre mot de passe régulièrement</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 bg-muted/30 border border-border rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-foreground"
                    placeholder="Saisissez votre mot de passe actuel"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 bg-muted/30 border border-border rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-foreground"
                      placeholder="8+ caractères"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Confirmer le nouveau</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 bg-muted/30 border border-border rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-foreground"
                      placeholder="Répétez le mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Enregistrer le mot de passe
              </button>
            </form>
          </div>

          {/* Notification Preferences */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">Préférences de notifications</h2>
                <p className="text-sm text-muted-foreground">Choisissez comment vous souhaitez être notifié</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { id: 'emailAppointments', label: 'Rendez-vous par email', desc: 'Recevez des confirmations de rendez-vous' },
                { id: 'emailDocuments', label: 'Documents par email', desc: 'Nouveaux documents disponibles' },
                { id: 'emailBilling', label: 'Factures par email', desc: 'Nouvelles factures et paiements' },
                { id: 'smsReminders', label: 'Rappels par SMS', desc: 'Rappels de rendez-vous 24h avant' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl hover:border-emerald-500/30 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[item.id]}
                      onChange={() => handleNotificationChange(item.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="lg:col-span-1">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 sticky top-24">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
              <Shield className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-3">Conseils de sécurité</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "Utilisez un mot de passe d'au moins 8 caractères",
                "Mélangez majuscules, minuscules, chiffres et symboles",
                "Ne réutilisez pas le même mot de passe sur d'autres sites",
                "Changez votre mot de passe régulièrement"
              ].map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;