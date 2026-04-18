import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ConfigProvider } from "./context/ConfigContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AdminProvider } from "./context/AdminContext";

import FinanceRoute from "./routes/FinanceRoute";
import AdminRoute from "./routes/AdminRoute";
import ReceptionRoute from "./routes/ReceptionRoute";
import ProtectedRoute from "./components/ProtectedRoute";

import { Toaster } from "./components/ui/sonner";
import { cn } from "./lib/utils";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import OfflineIndicator from "./components/OfflineIndicator";
import AppLauncher from "./components/AppLauncher";
import AuthWrapper from "./components/auth/AuthWrapper";

/* 🌍 Pages publiques */
import LandingPage from "./pages/Landingpage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

/* 🔐 Admin layout + pages */
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Patients from "./pages/admin/PatientList";
import PatientDetails from "./pages/admin/PatientDetails";
import AddPatient from "./pages/admin/AddPatient";
import Users from "./pages/admin/Users";
import Roles from "./pages/admin/Roles";
import Services from "./pages/admin/Services";
import Departments from "./pages/admin/Departments";
import Settings from "./pages/admin/Settings";
import AuditLogs from "./pages/admin/AuditLogs";
import Profile from "./pages/admin/Profile";
import HospitalSettings from "./pages/admin/HospitalSettings";

/* 👤 Patient layout + pages */
import PatientLayout from "./components/patients/PatientLayout";
import PatientDashboard from "./pages/Patients/PatientDashboard";
import PatientAppointments from "./pages/Patients/Appointments";
import AppointmentDetails from "./pages/Patients/AppointmentDetails";
import PatientProfile from "./pages/Patients/Profile";
import PatientBilling from "./pages/Patients/Billing";
import PatientSettings from "./pages/Patients/PatientSettings";
import PatientNotifications from "./pages/Patients/Notifications";
import PatientDocuments from "./pages/Patients/Documents";
import PatientChat from "./pages/Patients/PatientChat";

/* 👨‍⚕️ Doctor layout + pages */
import DoctorLayout from "./components/doctor/DoctorLayout";
import DoctorDashboard from "./pages/doctor/Dashboard";
import DoctorAgenda from "./pages/doctor/Agenda";
import DoctorPatients from "./pages/doctor/Patients";
import DoctorPatientDetail from "./pages/doctor/PatientDetail";
import DoctorConsultations from "./pages/doctor/Consultations";
import DoctorDocuments from "./pages/doctor/Documents";
import DoctorChat from "./pages/doctor/Chat";
import DoctorSettings from "./pages/doctor/Settings";
import ExamenClinique from "./pages/doctor/ExamenClinique";
import LabResultsDoctor from "./pages/doctor/LabResults";
import MedicalReportView from "./pages/doctor/MedicalReportView";

/* 🏨 Reception */
import ReceptionDashboard from "./pages/reception/Dashboard";
import Header from "./components/Reception/Header";
import ReceptionSidebar from "./components/Reception/Sidebar";
import PatientList from "./components/Reception/PatientList";
import PatientFolder from "./components/Reception/PatientFolder";
import EditAdmission from "./pages/reception/EditAdmission";
import { Admissions as ReceptionAdmissions } from "./pages/reception/Admissions";
import ReceptionDocuments from "./pages/reception/Documents";
import { Settings as ReceptionSettings } from "./pages/reception/Settings";
import { ExamReception } from "./pages/reception/ExamReception";
import ReceptionPayments from "./pages/reception/ReceptionPayments";

/* 💰 Finance */
import FinanceLayout from "./components/finance/FinanceLayout";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import CaissesUnifiees from "./pages/finance/CaissesUnifiees";
import CaisseAdmissions from "./pages/finance/CaisseAdmissions";
import CaisseLaboratoire from "./pages/finance/CaisseLaboratoire";
import CaissePharmacie from "./pages/finance/CaissePharmacie";
import { Settings as FinanceSettings } from "./pages/finance/Settings";
import FinanceNotifications from "./pages/finance/Notifications";

/* 🧪 Labo */
import LabLayout from "./pages/labo/LabLayout";
import LabDashboard from "./pages/labo/LabDashboard";
import LabQueue from "./pages/labo/LabQueue";
import LabResults from "./pages/labo/LabResults";
import LabWorkflow from "./pages/labo/LabWorkflow";
import LabHistory from "./pages/labo/LabHistory";
import LabAlerts from "./pages/labo/LabAlerts";
import LabSettings from "./pages/labo/LabSettings";

/* 💊 Pharmacie */
import PharmacyLayout from "./components/pharmacy/PharmacyLayout";
import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard";
import PharmacyOrders from "./pages/pharmacy/PharmacyOrders";
import PharmacyNewOrder from "./pages/pharmacy/PharmacyNewOrder";
import PharmacySales from "./pages/pharmacy/PharmacySales";
import PharmacySalesHistory from "./pages/pharmacy/PharmacySalesHistory";
import PharmacyInventory from "./pages/pharmacy/PharmacyInventory";
import PharmacyPrescriptions from "./pages/pharmacy/PharmacyPrescriptions";
import PharmacyReports from "./pages/pharmacy/PharmacyReports";
import PharmacyStockAlerts from "./pages/pharmacy/PharmacyStockAlerts";
import PharmacySettings from "./pages/pharmacy/PharmacySettings";

const Expenses = React.lazy(() => import("./pages/finance/Expenses"));
const Revenues = React.lazy(() => import("./pages/finance/Revenues"));
const Tarifs = React.lazy(() => import("./pages/finance/Tarifs"));
const ServiceManager = React.lazy(() => import("./pages/finance/ServiceManager"));
const InvoicesManagement = React.lazy(() => import("./pages/finance/InvoicesManagement"));
const LivreCaisse = React.lazy(() => import("./pages/finance/LivreCaisse"));
const DepensesEnAttente = React.lazy(() => import("./pages/finance/DepensesEnAttente"));
const AchatMedicament = React.lazy(() => import("./pages/pharmacy/AchatMedicament"));

const FinanceLoading = () => (
  <div className="flex items-center justify-center min-h-screen p-8 bg-surface">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    <span className="ml-3 text-lg font-semibold italic uppercase">
      Chargement...
    </span>
  </div>
);

// --- LAYOUT RÉCEPTION ---
const ReceptionLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem("reception_sidebar_state");
      return raw ? JSON.parse(raw) : false;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("reception_sidebar_state", JSON.stringify(isCollapsed));
    } catch (e) {}
  }, [isCollapsed]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ReceptionSidebar
        sidebarCollapsed={isCollapsed}
        setSidebarCollapsed={setIsCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
      <div
        className={cn(
          "flex flex-col flex-1 overflow-hidden transition-all duration-300",
          isCollapsed ? "lg:ml-20" : "lg:ml-72"
        )}
      >
        <Header isCollapsed={isCollapsed} />
        <main className="flex-1 overflow-y-auto bg-muted/5 scrollbar-thin">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <NotificationProvider>
          <ThemeProvider>
            <AppLauncher>
              <BrowserRouter>
                <AuthWrapper>
                <Routes>
                {/* 🌍 ROUTES PUBLIQUES */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* 👤 ROUTES PATIENTS */}
                <Route path="/patient" element={<PatientLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<PatientDashboard />} />
                  <Route path="notifications" element={<PatientNotifications />} />
                  <Route path="messages" element={<PatientChat />} />
                  <Route path="appointments" element={<PatientAppointments />} />
                  <Route path="documents" element={<PatientDocuments />} />
                  <Route path="appointments/:id" element={<AppointmentDetails />} />
                  <Route path="profile" element={<PatientProfile />} />
                  <Route path="billing" element={<PatientBilling />} />
                  <Route path="settings" element={<PatientSettings />} />
                </Route>

                {/* 👨‍⚕️ ROUTES DOCTEURS */}
                <Route
                  path="/doctor"
                  element={
                    <AdminProvider>
                      <DoctorLayout />
                    </AdminProvider>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<DoctorDashboard />} />
                  <Route path="agenda" element={<DoctorAgenda />} />
                  <Route path="patients" element={<DoctorPatients />} />
                  <Route path="patients/:id" element={<DoctorPatientDetail />} />
                  <Route path="consultations" element={<DoctorConsultations />} />
                  <Route path="examen/:id" element={<ExamenClinique />} />
                  <Route path="lab-results" element={<LabResultsDoctor />} />
                  <Route path="medical-report/:consultationId" element={<MedicalReportView />} />
                  <Route path="documents" element={<DoctorDocuments />} />
                  <Route path="chat" element={<DoctorChat />} />
                  <Route path="settings" element={<DoctorSettings />} />
                </Route>

                {/* 🏨 ROUTES RÉCEPTION */}
                <Route
                  path="/reception"
                  element={
                    <ReceptionRoute>
                      <AdminProvider>
                        <ReceptionLayout />
                      </AdminProvider>
                    </ReceptionRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<ReceptionDashboard />} />
                  <Route path="patients" element={<PatientList />} />
                  <Route path="patients/:id" element={<PatientFolder />} />
                  <Route path="edit-admission/:id" element={<EditAdmission />} />
                  <Route path="new-admission" element={<AddPatient />} />
                  <Route path="admissions" element={<ReceptionAdmissions />} />
                  <Route path="exams" element={<ExamReception />} />
                  <Route path="paiements" element={<ReceptionPayments />} />
                  <Route path="documents" element={<ReceptionDocuments />} />
                  <Route path="settings" element={<ReceptionSettings />} />
                  <Route path="medical-report/:consultationId" element={<MedicalReportView />} />
                </Route>

                {/* 💰 ROUTES FINANCE */}
                <Route
                  path="/finance"
                  element={
                    <FinanceRoute>
                      <FinanceLayout />
                    </FinanceRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<FinanceDashboard />} />
                  
                  {/* Nouvelle page caisses unifiée */}
                  <Route path="caisses" element={<CaissesUnifiees />} />
                  
                  {/* Redirections des anciennes routes vers la nouvelle page */}
                  <Route path="caisse-admissions" element={<Navigate to="/finance/caisses?tab=admissions" replace />} />
                  <Route path="caisse-laboratoire" element={<Navigate to="/finance/caisses?tab=laboratoire" replace />} />
                  <Route path="caisse-pharmacie" element={<Navigate to="/finance/caisses?tab=pharmacie" replace />} />
                  <Route
                    path="depenses"
                    element={
                      <Suspense fallback={<FinanceLoading />}>
                        <Expenses />
                      </Suspense>
                    }
                  />
                  <Route
                    path="entrees"
                    element={
                      <Suspense fallback={<FinanceLoading />}>
                        <Revenues />
                      </Suspense>
                    }
                  />
                  <Route
                    path="tarifs"
                    element={
                      <Suspense fallback={<FinanceLoading />}>
                        <Tarifs />
                      </Suspense>
                    }
                  />
                  <Route
                    path="services"
                    element={
                      <Suspense fallback={<FinanceLoading />}>
                        <ServiceManager />
                      </Suspense>
                    }
                  />
                  <Route
                    path="factures"
                    element={
                      <Suspense fallback={<FinanceLoading />}>
                        <InvoicesManagement />
                      </Suspense>
                    }
                  />
                  <Route
                    path="livre-caisse"
                    element={
                      <Suspense fallback={<FinanceLoading />}>
                        <LivreCaisse />
                      </Suspense>
                    }
                  />
                  <Route
                    path="depenses-en-attente"
                    element={
                      <Suspense fallback={<FinanceLoading />}>
                        <DepensesEnAttente />
                      </Suspense>
                    }
                  />
                  <Route path="settings" element={<FinanceSettings />} />
                  <Route path="notifications" element={<FinanceNotifications />} />
                </Route>

                {/* 🧪 ROUTES LABORATOIRE (protégé) */}
                <Route
                  path="/labo"
                  element={
                    <ProtectedRoute allowedRoles={["LABORATOIRE", "LABO", "ROLE_LABORATOIRE"]}>
                      <LabLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<LabDashboard />} />
                  <Route path="queue" element={<LabQueue />} />
                  
                  {/* ✅ CORRECTION ICI : Les deux routes permettent l'accès via Menu et via Redirection */}
                  <Route path="results" element={<LabResults />} />
                  <Route path="results/:patientId" element={<LabResults />} /> 
                  
                  <Route path="workflow" element={<LabWorkflow />} />
                  <Route path="history" element={<LabHistory />} />
                  <Route path="alerts" element={<LabAlerts />} />
                  <Route path="settings" element={<LabSettings />} />
                </Route>

                {/* ✅ Alias de compatibilité */}
                <Route path="/laboratory" element={<Navigate to="/labo/dashboard" replace />} />
                <Route path="/laboratory/*" element={<Navigate to="/labo/dashboard" replace />} />

                {/* 💊 ROUTES PHARMACIE (protégé) */}
                <Route
                  path="/pharmacy"
                  element={
                    <ProtectedRoute allowedRoles={["PHARMACY", "PHARMACIE", "ROLE_PHARMACY"]}>
                      <PharmacyLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<PharmacyDashboard />} />
                  <Route path="prescriptions" element={<PharmacyPrescriptions />} />
                  <Route path="prescriptions/:id" element={<div className="p-6"><h1 className="text-2xl font-bold">Détails Prescription - À implémenter</h1></div>} />
                  <Route path="orders" element={<PharmacyOrders />} />
                  <Route path="orders/new" element={<PharmacyNewOrder />} />
                  <Route path="orders/:id" element={<PharmacyOrders />} />
                  <Route path="inventory" element={<PharmacyInventory />} />
                  <Route path="inventory/:id" element={<PharmacyInventory />} />
                  <Route path="suppliers" element={<div className="p-6"><h1 className="text-2xl font-bold">Fournisseurs - À implémenter</h1></div>} />
                  <Route path="sales" element={<PharmacySales />} />
                  <Route path="sales/history" element={<PharmacySalesHistory />} />
                  <Route path="achat-medicament" element={<AchatMedicament />} />
                  <Route path="reports" element={<PharmacyReports />} />
                  <Route path="alerts" element={<PharmacyStockAlerts />} />
                  <Route path="settings" element={<PharmacySettings />} />
                </Route>

                {/* ✅ Alias de compatibilité Pharmacie */}
                <Route path="/pharmacie" element={<Navigate to="/pharmacy/dashboard" replace />} />
                <Route path="/pharmacie/*" element={<Navigate to="/pharmacy/dashboard" replace />} />

                {/* 🔐 ROUTES ADMIN */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminProvider>
                        <AdminLayout />
                      </AdminProvider>
                    </AdminRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="patients" element={<Patients />} />
                  <Route path="patients/nouveau" element={<AddPatient />} />
                  <Route path="patients/:id" element={<PatientDetails />} />
                  <Route path="utilisateurs" element={<Users />} />
                  <Route path="roles" element={<Roles />} />
                  <Route path="services" element={<Services />} />
                  <Route path="departements" element={<Departments />} />
                  <Route path="parametres" element={<Settings />} />
                  <Route path="hospital-settings" element={<HospitalSettings />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="profil" element={<Profile />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </AuthWrapper>

                <Toaster position="top-right" richColors />
                <PWAInstallPrompt />
                <OfflineIndicator />
              </BrowserRouter>
            </AppLauncher>
          </ThemeProvider>
        </NotificationProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;