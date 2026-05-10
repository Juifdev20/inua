import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  DollarSign, 
  RefreshCcw, 
  Save, 
  AlertCircle,
  TrendingUp,
  History,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * ★ PAGE: Configuration des Taux de Change
 * Permet à l'admin de configurer le taux USD/FC pour le catalogue des services
 */
const ExchangeRateConfig = () => {
  const navigate = useNavigate();
  
  // États
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [rates, setRates] = useState([]);

  // Récupérer le taux actuel
  const fetchCurrentRate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/admin/exchange-rates/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentRate(response.data);
      setNewRate(response.data.rate.toString());
    } catch (err) {
      console.error('Erreur lors de la récupération du taux:', err);
      setError('Impossible de récupérer le taux actuel');
    }
  };

  // Récupérer tous les taux
  const fetchAllRates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/admin/exchange-rates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRates(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des taux:', err);
    }
  };

  // Charger les données au montage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCurrentRate(), fetchAllRates()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Sauvegarder le nouveau taux
  const handleSave = async () => {
    if (!newRate || isNaN(newRate) || parseFloat(newRate) <= 0) {
      setError('Veuillez entrer un taux valide (nombre positif)');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      const rateData = {
        currencyFrom: 'USD',
        currencyTo: 'FC',
        rate: parseFloat(newRate),
        description: description || `Taux USD/FC mis à jour le ${new Date().toLocaleDateString('fr-FR')}`
      };

      await axios.post(`${API_URL}/api/v1/admin/exchange-rates`, rateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      await fetchCurrentRate();
      await fetchAllRates();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde du taux');
    } finally {
      setSaving(false);
    }
  };

  // Initialiser le taux par défaut
  const handleInitialize = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_URL}/api/v1/admin/exchange-rates/initialize`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      await fetchCurrentRate();
      await fetchAllRates();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur lors de l\'initialisation:', err);
      setError('Erreur lors de l\'initialisation du taux par défaut');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/dashboard')}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Retour</span>
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <DollarSign className="w-5 h-5 text-primary shrink-0" />
                <h1 className="text-lg sm:text-xl font-semibold truncate">Taux de Change</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Titre et description */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Configuration des Taux de Change</h2>
          <p className="text-muted-foreground">
            Configurez le taux de conversion USD vers Francs Congolais (FC) utilisé dans le catalogue des services.
            Ce taux est appliqué automatiquement lors de l'affichage des prix aux patients.
          </p>
        </div>

        {/* Messages de succès/erreur */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300 font-medium">
              Taux de change mis à jour avec succès !
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Carte du taux actuel */}
        <Card className="mb-6 border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Taux Actuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : currentRate ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">1 USD</span>
                  <span className="text-2xl text-muted-foreground">=</span>
                  <span className="text-4xl font-black text-primary">
                    {currentRate.rate.toLocaleString('fr-FR')} FC
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ce taux est actuellement utilisé pour toutes les conversions dans le catalogue des services.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <p className="text-amber-700 dark:text-amber-300">
                  Aucun taux configuré. Veuillez initialiser le taux par défaut.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulaire de mise à jour */}
        <Card className="mb-6 border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-primary" />
              Mettre à jour le Taux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nouveau Taux (1 USD = ? FC)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Ex: 2800"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Entrez le nombre de Francs Congolais pour 1 Dollar US.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (optionnel)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Taux du 8 mai 2026"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !newRate}
                  className="gap-2"
                >
                  {saving ? (
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Sauvegarde...' : 'Sauvegarder le Taux'}
                </Button>

                {!currentRate && (
                  <Button 
                    variant="outline" 
                    onClick={handleInitialize}
                    disabled={saving}
                    className="gap-2"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Initialiser (2800 FC)
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historique des taux */}
        {rates.length > 0 && (
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Historique des Taux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Paire</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Taux</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Description</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Statut</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Modifié par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate) => (
                      <tr key={rate.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 px-3 text-sm font-medium">
                          {rate.currencyFrom} / {rate.currencyTo}
                        </td>
                        <td className="py-3 px-3 text-sm">
                          <span className="font-bold text-primary">
                            {rate.rate.toLocaleString('fr-FR')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sm text-muted-foreground">
                          {rate.description || '-'}
                        </td>
                        <td className="py-3 px-3">
                          {rate.isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm text-muted-foreground">
                          {rate.updatedByName || 'System'}
                          <div className="text-xs">
                            {rate.updatedAt && new Date(rate.updatedAt).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                Comment fonctionne le taux de change ?
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Ce taux est utilisé pour convertir les prix du catalogue des services (USD → FC)</li>
                <li>• Les patients voient les prix dans la devise qu'ils sélectionnent</li>
                <li>• Le taux par défaut est de 1 USD = 2800 FC</li>
                <li>• Les modifications sont appliquées immédiatement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateConfig;
