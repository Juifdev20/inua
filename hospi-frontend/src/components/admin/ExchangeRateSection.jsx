import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  RefreshCw, 
  Save, 
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Info,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * ★ COMPOSANT: Section Taux de Change
 * Intégré dans l'onglet Financier de la configuration hôpital
 */
const ExchangeRateSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [description, setDescription] = useState('');
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
      // Si pas de taux, on met 2800 par défaut
      setNewRate('2800');
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
      toast.error('Veuillez entrer un taux valide (nombre positif)');
      return;
    }

    try {
      setSaving(true);
      
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

      toast.success('Taux de change mis à jour avec succès !');
      await fetchCurrentRate();
      await fetchAllRates();
      setDescription('');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      toast.error('Erreur lors de la sauvegarde du taux');
    } finally {
      setSaving(false);
    }
  };

  // Initialiser le taux par défaut
  const handleInitialize = async () => {
    try {
      setSaving(true);
      
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_URL}/api/v1/admin/exchange-rates/initialize`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Taux par défaut initialisé avec succès !');
      await fetchCurrentRate();
      await fetchAllRates();
    } catch (err) {
      console.error('Erreur lors de l\'initialisation:', err);
      toast.error('Erreur lors de l\'initialisation du taux par défaut');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-muted-foreground">Chargement du taux...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Carte du taux actuel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Taux de Change Actuel
          </CardTitle>
          <CardDescription>
            Taux utilisé pour les conversions USD ↔ FC dans le catalogue des services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentRate ? (
            <div className="space-y-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-foreground">1 USD</span>
                <span className="text-xl sm:text-2xl text-muted-foreground">=</span>
                <span className="text-3xl sm:text-4xl font-black text-blue-600">
                  {currentRate.rate.toLocaleString('fr-FR')} FC
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ce taux est actuellement utilisé pour toutes les conversions dans le catalogue des services patient.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Aucun taux configuré. Veuillez initialiser le taux par défaut (2800 FC).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulaire de mise à jour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Mettre à jour le Taux
          </CardTitle>
          <CardDescription>
            Modifiez le taux de conversion USD vers Francs Congolais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="exchangeRate">
                Nouveau Taux (1 USD = ? FC)
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Ex: 2800"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground whitespace-nowrap">FC</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Entrez le nombre de Francs Congolais pour 1 Dollar US.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="rateDescription">
                Description (optionnel)
              </Label>
              <Input
                id="rateDescription"
                type="text"
                placeholder="Ex: Taux du 8 mai 2026 - Révision mensuelle"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 sm:col-span-2 pt-2">
              <Button 
                onClick={handleSave} 
                disabled={saving || !newRate}
                className="gap-2"
                size="sm"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
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
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Initialiser (2800 FC)
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique des taux */}
      {rates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="w-5 h-5 text-violet-600" />
              Historique des Modifications
            </CardTitle>
            <CardDescription>
              Dernières modifications du taux de change
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Paire</th>
                    <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Taux</th>
                    <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                    <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Statut</th>
                    <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell">Par</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.slice(0, 5).map((rate) => (
                    <tr key={rate.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-2 text-xs sm:text-sm font-medium">
                        {rate.currencyFrom} / {rate.currencyTo}
                      </td>
                      <td className="py-2 px-2 text-xs sm:text-sm">
                        <span className="font-bold text-blue-600">
                          {rate.rate.toLocaleString('fr-FR')}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs sm:text-sm text-muted-foreground hidden sm:table-cell max-w-[150px] truncate">
                        {rate.description || '-'}
                      </td>
                      <td className="py-2 px-2">
                        {rate.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactif</Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground hidden md:table-cell">
                        <div>{rate.updatedByName || 'System'}</div>
                        <div className="text-[10px] opacity-70">
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
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1 text-sm">
              Comment fonctionne le taux de change ?
            </h4>
            <ul className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Ce taux est utilisé pour convertir les prix du catalogue des services (USD → FC)</li>
              <li>• Les patients voient les prix dans la devise qu'ils sélectionnent (USD ou FC)</li>
              <li>• Le taux par défaut est de 1 USD = 2800 FC</li>
              <li>• Les modifications sont appliquées immédiatement sur le catalogue</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateSection;
