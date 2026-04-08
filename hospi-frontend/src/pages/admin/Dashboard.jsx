import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, UserCog, UserCheck, Building2, TrendingUp, 
  Calendar, Activity, DollarSign, Clock 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BACKEND_URL } from '../../config/environment.js';

const Dashboard = () => {
  // ✅ Configuration environnementale centralisée
    const API_BASE_URL = BACKEND_URL;
  
  // 1. États pour les données réelles
  const [data, setData] = useState({
    stats: { 
        utilisateursTotal: 0, 
        newUsersMonth: 0,
        docteurs: 0, 
        newDoctorsMonth: 0,
        patients: 0, 
        newPatientsMonth: 0,
        departements: 0,
        pendingAppointments: 0 // Gardé pour l'étape 2
    },
    consultations: [],
    patientsDept: [],
    revenu: [],
    activities: []
  });
  const [loading, setLoading] = useState(true);

  // 2. Récupération des données depuis Spring Boot
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token'); 
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // Appel parallèle pour les stats et les graphiques
        const [statsRes, chartRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/dashboard/stats`, config),
          axios.get(`${API_BASE_URL}/api/admin/charts`, config).catch(() => ({ data: null }))
        ]);

        const s = statsRes.data || {};
        
        // Normalisation sans casser les noms de champs existants
        const normalizedStats = {
          utilisateursTotal: s.totalUsers || 0,
          newUsersMonth: s.newUsersMonth || 0,
          docteurs: s.totalDoctors || 0,
          newDoctorsMonth: s.newDoctorsMonth || 0,
          patients: s.totalPatients || 0,
          newPatientsMonth: s.newPatientsMonth || 0,
          departements: s.totalDepartments || 0,
          pendingAppointments: s.pendingAppointments || 0 
        };

        setData({
          stats: normalizedStats,
          consultations: chartRes?.data?.consultations || [],
          patientsDept: chartRes?.data?.patientsParDepartement || [],
          revenu: chartRes?.data?.revenuMensuel || [],
          activities: Array.isArray(s.activities) ? s.activities : []
        });
      } catch (error) {
        console.error("Erreur Backend Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 3. Configuration des cartes de statistiques
  const statsCards = [
    {
      title: 'Utilisateurs Total',
      value: data.stats.utilisateursTotal,
      icon: Users,
      change: `+${data.stats.newUsersMonth}`, 
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      title: 'Docteurs',
      value: data.stats.docteurs,
      icon: UserCog,
      change: `+${data.stats.newDoctorsMonth}`, 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Patients',
      value: data.stats.patients,
      icon: UserCheck,
      change: `+${data.stats.newPatientsMonth}`, 
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      title: 'RDV en Attente',
      value: data.stats.pendingAppointments,
      icon: Clock,
      change: 'À décider',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ];

  const COLORS = ['hsl(150, 86%, 60%)', 'hsl(222, 100%, 59%)', 'hsl(180, 50%, 60%)', 'hsl(38, 92%, 50%)'];

  const getActivityStyles = (type) => {
    const styles = {
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-destructive/10 text-destructive',
      info: 'bg-info/10 text-info'
    };
    return styles[type] || styles.info;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-space-grotesk font-bold text-primary animate-pulse">Synchronisation des données...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-space-grotesk font-bold text-foreground mb-2 tracking-tighter uppercase">Tableau de Bord</h1>
          <p className="text-muted-foreground flex items-center gap-2 italic">
            <Activity className="w-4 h-4 text-primary" /> Données administratives en temps réel
          </p>
        </div>
        <Badge variant="outline" className="gap-2 h-fit py-2 px-4 border-primary/20 bg-primary/5">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-bold">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </Badge>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-none bg-card/50 backdrop-blur-sm group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.title}</CardTitle>
                <div className={`w-10 h-10 rounded-2xl ${stat.bgColor} flex items-center justify-center group-hover:rotate-12 transition-transform`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-space-grotesk font-black text-foreground mb-1 tracking-tighter">
                    {stat.value.toLocaleString()}
                </div>
                <p className={`text-[10px] font-bold uppercase flex items-center gap-1 ${stat.title === 'RDV en Attente' ? 'text-warning' : 'text-success'}`}>
                    {stat.title !== 'RDV en Attente' && <TrendingUp className="w-3 h-3" />} {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-lg font-space-grotesk font-bold uppercase tracking-tight">Consultations par Mois</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.consultations.length > 0 ? data.consultations : [{mois: 'Jan', consultations: 0}]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="mois" axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '16px', border: 'none' }} />
                <Line type="monotone" dataKey="consultations" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ fill: 'hsl(var(--primary))', r: 6 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-lg font-space-grotesk font-bold uppercase tracking-tight">Patients par Département</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                    data={data.patientsDept.length > 0 ? data.patientsDept : [{nom: 'Aucun', valeur: 1}]} 
                    cx="50%" cy="50%" 
                    innerRadius={60} outerRadius={100} 
                    paddingAngle={5} dataKey="valeur"
                >
                  {(data.patientsDept.length > 0 ? data.patientsDept : [1]).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Section */}
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-lg font-space-grotesk font-bold uppercase tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" /> Revenu Mensuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.revenu.length > 0 ? data.revenu : [{mois: 'Jan', revenu: 0}]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mois" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="revenu" fill="hsl(var(--secondary))" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activities Section */}
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-space-grotesk font-bold uppercase tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Activités Récentes
          </CardTitle>
          <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-widest">PostgreSQL Live</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.activities.length > 0 ? (
                data.activities.map((activity, idx) => (
                    <div key={activity.id || idx} className="flex items-start gap-4 p-4 rounded-3xl hover:bg-muted/50 transition-all group border border-transparent hover:border-border">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-110 ${getActivityStyles(activity.type)}`}>
                        {activity.type === 'success' ? '✓' : 'ℹ'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold tracking-tight">{activity.action}</p>
                        <p className="text-xs text-muted-foreground font-medium">{activity.utilisateur} • {activity.details}</p>
                      </div>
                      <div className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded-full uppercase">
                        {activity.date ? new Date(activity.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center py-10 text-muted-foreground italic">
                    <p className="text-sm">Aucune activité récente à afficher</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
