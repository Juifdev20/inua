import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, Download, Loader2, FileText, Search, ArrowUpDown } from 'lucide-react';
import api from '../../services/patients/Api'; 
import { cn } from '../../lib/utils';

const Billing = () => {
  const [billings, setBillings] = useState([]);
  const [stats, setStats] = useState({ totalPaid: 0, totalPending: 0, totalInvoiced: 0 });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  // 1. Chargement et Tri des données
  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      try {
        const [statsRes, invoicesRes] = await Promise.all([
          api.get('/invoices/patient/stats'),
          api.get('/invoices/patient/my-invoices?size=100')
        ]);

        // Mapping des stats - Corrigé pour forcer la conversion numérique (BigDecimal -> Number)
        const s = statsRes.data;
        setStats({
          totalPaid: Number(s?.totalPaid || s?.totalPaye || 0),
          totalPending: Number(s?.totalPending || s?.totalEnAttente || 0),
          totalInvoiced: Number(s?.totalInvoiced || s?.totalFacture || 0)
        });
        
        // Extraction et Tri par date (Décroissant : plus récent d'abord)
        const invoiceData = invoicesRes.data.content || (Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
        const sortedData = [...invoiceData].sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        setBillings(sortedData);
      } catch (error) {
        console.error("Erreur récupération facturation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  // 2. Téléchargement PDF
  const handleDownloadPDF = async (invoiceId, invoiceCode) => {
    setDownloadingId(invoiceId);
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Facture-${invoiceCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  // 3. Filtrage combiné
  const filteredBillings = billings.filter((bill) => {
    const matchesSearch = bill.invoiceCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'paid' ? bill.status === 'PAYEE' :
      bill.status !== 'PAYEE';

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Chargement sécurisé de vos factures...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">
            Gestion Facturation
          </h1>
          <p className="text-muted-foreground font-medium">Historique classé par date d'émission</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-emerald-500/20">
          <ArrowUpDown className="w-4 h-4" />
          Trié par : Plus récent
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 transition-all hover:scale-[1.02]">
          <p className="text-emerald-500 text-xs font-black uppercase mb-1">Total Payé</p>
          <h3 className="text-3xl font-bold text-foreground">{(stats.totalPaid || 0).toLocaleString()} $</h3>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 transition-all hover:scale-[1.02]">
          <p className="text-amber-500 text-xs font-black uppercase mb-1">Reste à Payer</p>
          <h3 className="text-3xl font-bold text-foreground">{(stats.totalPending || 0).toLocaleString()} $</h3>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 transition-all hover:scale-[1.02]">
          <p className="text-blue-500 text-xs font-black uppercase mb-1">Documents</p>
          <h3 className="text-3xl font-bold text-foreground">{billings.length}</h3>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
          {['all', 'paid', 'pending'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2 rounded-xl font-bold text-xs transition-all border shrink-0 uppercase tracking-tighter",
                filter === f
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
              )}
            >
              {f === 'all' ? 'Toutes' : f === 'paid' ? 'Payées' : 'Attentes'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="N° de facture (ex: INV-2024...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {filteredBillings.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredBillings.map((billing) => (
              <div key={billing.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-5 hover:bg-muted/20 transition-colors items-center">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 uppercase font-bold text-xs">
                      {billing.status === 'PAYEE' ? 'OK' : '!!'}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{billing.invoiceCode}</h4>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider italic">
                        {billing.notes || "Prestations médicales"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold md:mb-1">Émise le</span>
                  <span className="text-sm font-semibold italic">
                    {billing.createdAt ? new Date(billing.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold md:mb-1">Montant</span>
                  <p className="font-black text-emerald-600 text-base italic">{(billing.totalAmount || 0).toFixed(2)} $</p>
                </div>

                <div>
                  <span className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black border uppercase tracking-widest",
                    billing.status === 'PAYEE' 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  )}>
                    {billing.status === 'PAYEE' ? 'RÉGLÉE' : 'EN ATTENTE'}
                  </span>
                </div>

                <div className="flex justify-start md:justify-end">
                  <button 
                    onClick={() => handleDownloadPDF(billing.id, billing.invoiceCode)}
                    disabled={downloadingId === billing.id}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-emerald-500 hover:text-white transition-all font-bold text-[11px] uppercase disabled:opacity-50"
                  >
                    {downloadingId === billing.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Reçu PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-bold">Aucune facture trouvée</h3>
            <p className="text-sm text-muted-foreground">Modifiez votre recherche ou vos filtres.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;