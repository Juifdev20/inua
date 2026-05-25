import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Building2, FileDown, Loader2, Calendar, Users, DollarSign, Download,
  Search, TrendingUp, ArrowRight,
} from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const statusBadge = (status) => {
  const cls = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    EXPIRED: 'bg-red-500/10 text-red-600 border-red-500/20',
  }[status] || '';
  const label = { ACTIVE: 'Actif', SUSPENDED: 'Suspendu', EXPIRED: 'Expiré' }[status] || status;
  return <span className={`px-2 py-0.5 text-xs rounded-md border ${cls}`}>{label}</span>;
};

export default function CompanyConsumptionPage() {
  const { t } = useTranslation();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(null);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await companyService.getAllStats();
      setCompanies(data || []);
    } catch (e) {
      toast.error('Impossible de charger les entreprises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDownloadPDF = async (companyId, companyName) => {
    setDownloadingPDF(companyId);
    try {
      const [year, month] = selectedMonth.split('-');
      const blob = await companyService.downloadConsumptionSheet(companyId, parseInt(year), parseInt(month));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Consommation_${companyName}_${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF téléchargé avec succès');
    } catch (e) {
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingPDF(null);
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Feuilles de consommation des entreprises
          </h1>
          <p className="text-muted-foreground mt-1">
            Téléchargez les feuilles de consommation mensuelles pour toutes les entreprises abonnées
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mois de consommation</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Entreprise ou contact..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
            <Button onClick={refresh} variant="outline" size="sm">
              <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {searchQuery ? 'Aucune entreprise trouvée' : 'Aucune entreprise abonnée'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Employés</TableHead>
                  <TableHead className="text-right">Admissions</TableHead>
                  <TableHead className="text-right">Total couvert</TableHead>
                  <TableHead className="text-right">Ticket modeste</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.contactPerson || '—'}</TableCell>
                    <TableCell>{statusBadge(company.subscriptionStatus)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{company.employeeCount || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{company.admissionCount || 0}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {formatCurrency(company.totalCompanyCoverage)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">
                      {formatCurrency(company.totalPatientSurplus)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleDownloadPDF(company.id, company.name)}
                        disabled={downloadingPDF === company.id}
                        className="gap-2"
                      >
                        {downloadingPDF === company.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
