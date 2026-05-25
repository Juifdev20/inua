import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, TrendingUp, Users, Activity, HeartPulse, ArrowRight,
} from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function SubscriptionReportsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await companyService.getAllStats();
        setStats(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error('Impossible de charger les rapports abonnés');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalEmployees = stats.reduce((s, c) => s + (c.totalEmployees || 0), 0);
  const totalActive = stats.reduce((s, c) => s + (c.activeEmployees || 0), 0);
  const totalAdmissionsMonth = stats.reduce((s, c) => s + (c.totalAdmissionsCurrentMonth || 0), 0);
  const totalCoverageMonth = stats.reduce((s, c) => s + (c.totalCompanyCoverageCurrentMonth || 0), 0);
  const totalSurplusMonth = stats.reduce((s, c) => s + (c.totalPatientSurplusCurrentMonth || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/companies')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Rapports Abonnés
          </h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble des entreprises et consommations</p>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Entreprises</p>
            <p className="text-2xl font-bold text-primary">{stats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Agents actifs</p>
            <p className="text-2xl font-bold text-emerald-600">{totalActive}</p>
            <p className="text-[10px] text-muted-foreground">/ {totalEmployees} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Admissions ce mois</p>
            <p className="text-2xl font-bold text-blue-600">{totalAdmissionsMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Prise en charge ce mois</p>
            <p className="text-2xl font-bold text-purple-600">{Number(totalCoverageMonth).toFixed(2)} $</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Ticket modeste ce mois</p>
            <p className="text-2xl font-bold text-amber-600">{Number(totalSurplusMonth).toFixed(2)} $</p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-pink-500" />
            Détails par entreprise
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Chargement…</div>
          ) : stats.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Aucune entreprise enregistrée.</div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead className="text-right">Agents actifs</TableHead>
                    <TableHead className="text-right">Admissions (mois)</TableHead>
                    <TableHead className="text-right">Prise en charge</TableHead>
                    <TableHead className="text-right">Ticket modeste</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((s) => (
                    <TableRow key={s.companyId}>
                      <TableCell className="font-medium">{s.companyName}</TableCell>
                      <TableCell className="text-right">{s.activeEmployees} / {s.totalEmployees}</TableCell>
                      <TableCell className="text-right">{s.totalAdmissionsCurrentMonth}</TableCell>
                      <TableCell className="text-right text-purple-600 font-medium">
                        {Number(s.totalCompanyCoverageCurrentMonth ?? 0).toFixed(2)} $
                      </TableCell>
                      <TableCell className="text-right text-amber-600 font-medium">
                        {Number(s.totalPatientSurplusCurrentMonth ?? 0).toFixed(2)} $
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate(`/admin/companies/${s.companyId}`)}>
                          Détails <ArrowRight className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
