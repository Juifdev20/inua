import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, ArrowRight, X, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import api from '../../services/api/api';
import { toast } from 'sonner';

const PatientResultComparison = ({ patientId, patientName, patientHistory, open, onClose }) => {
  const [selectedTest, setSelectedTest] = useState('ALL');
  const [timeRange, setTimeRange] = useState('ALL');

  // Utiliser les données passées en prop ou les charger si non disponibles
  const history = useMemo(() => {
    if (patientHistory) {
      return patientHistory.filter(h => 
        h.patientId === patientId || 
        h.patient?.toLowerCase().includes(patientName?.toLowerCase())
      );
    }
    return [];
  }, [patientHistory, patientId, patientName]);

  // Extraire les tests uniques
  const availableTests = useMemo(() => {
    const tests = new Set();
    history.forEach(h => {
      if (h.exam) tests.add(h.exam);
    });
    return Array.from(tests).sort();
  }, [history]);

  // Filtrer par test et période
  const filteredHistory = useMemo(() => {
    let results = [...history];

    if (selectedTest !== 'ALL') {
      results = results.filter(h => h.exam === selectedTest);
    }

    if (timeRange !== 'ALL') {
      const now = new Date();
      const daysBack = {
        '7D': 7,
        '30D': 30,
        '90D': 90,
        '1Y': 365,
      }[timeRange];
      
      if (daysBack) {
        const cutoff = new Date(now.setDate(now.getDate() - daysBack));
        results = results.filter(h => new Date(h.date) >= cutoff);
      }
    }

    return results.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [history, selectedTest, timeRange]);

  // Grouper par test pour comparaison
  const groupedByTest = useMemo(() => {
    const groups = {};
    filteredHistory.forEach(h => {
      if (!groups[h.exam]) {
        groups[h.exam] = [];
      }
      groups[h.exam].push(h);
    });
    return groups;
  }, [filteredHistory]);

  // Calculer la tendance pour un test
  const getTrend = (testResults) => {
    if (testResults.length < 2) return null;
    
    const numericResults = testResults
      .map(r => parseFloat(r.result))
      .filter(r => !isNaN(r));
    
    if (numericResults.length < 2) return null;

    const latest = numericResults[numericResults.length - 1];
    const previous = numericResults[numericResults.length - 2];
    const difference = latest - previous;
    const percentChange = previous !== 0 ? (difference / previous) * 100 : 0;

    return {
      difference,
      percentChange,
      direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable',
      latest,
      previous
    };
  };

  const renderTestCard = (testName, results) => {
    const trend = getTrend(results);
    
    return (
      <Card key={testName} className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{testName}</CardTitle>
            {trend && (
              <Badge 
                variant="outline"
                className={
                  trend.direction === 'up' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                  trend.direction === 'down' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                  'bg-muted text-muted-foreground'
                }
              >
                {trend.direction === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                {trend.direction === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                {trend.direction === 'stable' && <Minus className="w-3 h-3 mr-1" />}
                {trend.percentChange.toFixed(1)}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.slice(-5).map((r, idx) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{r.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${r.isCritical ? 'text-rose-500' : ''}`}>
                    {r.result} {r.unit}
                  </span>
                  {idx < results.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {trend && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Précédent:</span>
                <span className="font-medium">{trend.previous} {results[0]?.unit}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">Actuel:</span>
                <span className={`font-medium ${trend.direction === 'up' ? 'text-emerald-600' : trend.direction === 'down' ? 'text-rose-600' : ''}`}>
                  {trend.latest} {results[0]?.unit}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="dialog-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">
                Comparaison des Résultats
              </DialogTitle>
              <p id="dialog-description" className="text-sm text-muted-foreground mt-1">
                {patientName} - Évolution dans le temps
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les examens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les examens</SelectItem>
                  {availableTests.map(test => (
                    <SelectItem key={test} value={test}>{test}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Toute la période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toute la période</SelectItem>
                  <SelectItem value="7D">7 derniers jours</SelectItem>
                  <SelectItem value="30D">30 derniers jours</SelectItem>
                  <SelectItem value="90D">90 derniers jours</SelectItem>
                  <SelectItem value="1Y">1 an</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun résultat trouvé pour ce patient.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTest === 'ALL' ? (
                Object.entries(groupedByTest).map(([test, results]) =>
                  renderTestCard(test, results)
                )
              ) : (
                groupedByTest[selectedTest] && renderTestCard(selectedTest, groupedByTest[selectedTest])
              )}
            </div>
          )}

          {/* Statistiques globales */}
          {filteredHistory.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{filteredHistory.length}</p>
                    <p className="text-xs text-muted-foreground">Examens totaux</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(groupedByTest).length}</p>
                    <p className="text-xs text-muted-foreground">Types d'examens</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-rose-500">
                      {filteredHistory.filter(r => r.isCritical).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Critiques</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-500">
                      {filteredHistory.filter(r => r.status === 'VALIDÉ' || r.status === 'RESULTS_AVAILABLE').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Validés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientResultComparison;
