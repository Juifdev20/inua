import React, { useState } from 'react';
import { loadHospitalConfig, resolveLogoUrl } from '../../utils/printUtils';
import { API_BASE_URL } from '../../config/environment.js';
import { CheckCircle, Copy, Printer, X, User, Lock, Info } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ★ MODALE DE SUCCÈS - AFFICHAGE DES IDENTIFIANTS GÉNÉRÉS
 * S'affiche après la création automatique d'un compte utilisateur
 */
const SuccessAccountModal = ({ isOpen, onClose, credentials, userType = 'staff' }) => {
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !credentials) return null;

  const { username, generatedPassword, user } = credentials;
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success(`${field === 'username' ? 'Identifiant' : 'Mot de passe'} copié !`);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      toast.error('Erreur lors de la copie');
    });
  };

  const handlePrint = async () => {
    const hospitalConfig = await loadHospitalConfig();
    const logoUrl = hospitalConfig?.hospitalLogoUrl && hospitalConfig?.enableLogoOnDocuments !== false
      ? resolveLogoUrl(hospitalConfig.hospitalLogoUrl, API_BASE_URL)
      : null;
    const primaryColor = hospitalConfig?.primaryColor || '#059669';
    const printWindow = window.open('', '_blank');
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Identifiants de Connexion - ${hospitalConfig?.hospitalName || 'Hôpital'}</title>
        <style>
          @page { size: A5; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 5px;
          }
          .subtitle {
            color: #6b7280;
            font-size: 14px;
          }
          .divider {
            height: 1px;
            background: #e5e7eb;
            margin: 25px 0;
          }
          .info-section {
            margin-bottom: 25px;
          }
          .info-label {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .info-value {
            font-size: 18px;
            font-weight: 700;
            color: #1f2937;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 12px;
            border: 2px dashed #d1d5db;
          }
          .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 12px;
            padding: 15px;
            margin-top: 20px;
          }
          .warning-title {
            font-size: 13px;
            font-weight: 700;
            color: #92400e;
            margin-bottom: 5px;
          }
          .warning-text {
            font-size: 12px;
            color: #a16207;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #9ca3af;
          }
          @media print {
            body { background: white; }
            .card { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />` : ''}
            <div class="title">${hospitalConfig?.hospitalName || 'H\u00f4pital'}</div>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 16px; font-weight: 600; color: #059669;">
              ✓ Compte créé avec succès
            </div>
          </div>
          
          ${fullName ? `
          <div class="info-section">
            <div class="info-label">Nom complet</div>
            <div class="info-value">${fullName}</div>
          </div>
          ` : ''}
          
          <div class="divider"></div>
          
          <div class="info-section">
            <div class="info-label">Identifiant de connexion</div>
            <div class="info-value">${username}</div>
          </div>
          
          <div class="info-section">
            <div class="info-label">Mot de passe temporaire</div>
            <div class="info-value" style="font-family: monospace; letter-spacing: 1px;">${generatedPassword}</div>
          </div>
          
          <div class="warning">
            <div class="warning-title">⚠️ Important</div>
            <div class="warning-text">
              Vous devrez changer ce mot de passe lors de votre première connexion.
              Conservez ces informations en lieu sûr.
            </div>
          </div>
          
          <div class="footer">
            Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </div>
        </div>
        <script>window.onload = () => { setTimeout(() => window.print(), 500); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md transform animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Compte créé !</h2>
                <p className="text-emerald-100 text-sm">
                  {userType === 'staff' ? 'Utilisateur staff' : 'Patient'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* User info */}
            {fullName && (
              <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Compte créé pour</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{fullName}</p>
              </div>
            )}

            {/* Credentials */}
            <div className="space-y-4">
              {/* Username */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  <User className="w-4 h-4" />
                  Identifiant
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-gray-900 px-3 py-2 rounded-lg font-mono text-lg font-semibold text-emerald-600 dark:text-emerald-400 border border-gray-200 dark:border-gray-700">
                    {username}
                  </code>
                  <button
                    onClick={() => handleCopy(username, 'username')}
                    className={`p-2 rounded-lg transition-all ${
                      copiedField === 'username'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                    }`}
                    title="Copier l'identifiant"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border-2 border-amber-200 dark:border-amber-800">
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                  <Lock className="w-4 h-4" />
                  Mot de passe temporaire
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-gray-900 px-3 py-2 rounded-lg font-mono text-lg font-semibold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    {generatedPassword}
                  </code>
                  <button
                    onClick={() => handleCopy(generatedPassword, 'password')}
                    className={`p-2 rounded-lg transition-all ${
                      copiedField === 'password'
                        ? 'bg-amber-200 text-amber-700 dark:bg-amber-800'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-600 dark:bg-amber-900/40 dark:hover:bg-amber-900/60'
                    }`}
                    title="Copier le mot de passe"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Changement de mot de passe obligatoire
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    L'utilisateur devra changer ce mot de passe lors de sa première connexion.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-all"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessAccountModal;
