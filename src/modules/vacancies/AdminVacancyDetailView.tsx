import React, { useState } from 'react';
import { Vacancy2026, Candidate2026, Application2026, VacancyStatus } from '../../types';
import { storage } from '../../lib/storage';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  Users,
  BarChart3,
  DollarSign,
  GraduationCap,
  Languages,
  Folder,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  Search,
  Copy,
  Check,
  Building
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { hasMasterDegree, parseSalaryNumber } from '../../lib/analyticsUtils';
import { safeExternalUrl, sanitizeRowForSpreadsheet } from '../../lib/security';
import { isGoogleDriveLink, buildVacancyHeaders, syncGoogleSheetWithBinary } from '../../lib/driveUpload';
import { syncPipelineStagesFromBigin } from '../../lib/biginService';

interface AdminVacancyDetailViewProps {
  vacancy: Vacancy2026;
  candidates: Candidate2026[];
  applications: Application2026[];
  onBack: () => void;
  onRefresh?: () => void;
}

export const AdminVacancyDetailView: React.FC<AdminVacancyDetailViewProps> = ({
  vacancy,
  candidates,
  applications,
  onBack,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'stats'>('candidates');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [vacancyStatus, setVacancyStatus] = useState<VacancyStatus>(vacancy.status);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [isSyncingBigin, setIsSyncingBigin] = useState(false);
  const [biginSyncFeedback, setBiginSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSyncBiginStages = async () => {
    setIsSyncingBigin(true);
    setBiginSyncFeedback(null);
    try {
      const res = await syncPipelineStagesFromBigin(vacancy);
      if (res.success) {
        setBiginSyncFeedback({
          type: 'success',
          text: `✓ Pipeline sincronizado: ${res.syncedCount} candidato(s) actualizados con sus etapas reales desde Bigin CRM (${res.totalDeals} tratos analizados en "${vacancy.biginSubPipelineName || vacancy.title}").`
        });
        if (onRefresh) onRefresh();
      } else {
        setBiginSyncFeedback({
          type: 'error',
          text: `Error al sincronizar con Bigin: ${res.error || 'No se pudo conectar'}`
        });
      }
    } catch (err: any) {
      setBiginSyncFeedback({
        type: 'error',
        text: `Error de conexión: ${err?.message || err}`
      });
    } finally {
      setIsSyncingBigin(false);
    }
  };

  const handleVacancyStatusChange = async (newStatus: VacancyStatus) => {
    setVacancyStatus(newStatus);
    await storage.updateVacancyStatus(vacancy.id, newStatus);
    if (onRefresh) onRefresh();
  };

  const getFormUrl = () => {
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/admin.*$/, '');
    return `${origin}${path}?job=${encodeURIComponent(vacancy.id)}`;
  };

  const handleCopyLink = () => {
    const url = getFormUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenForm = () => {
    const url = getFormUrl();
    window.open(url, '_blank');
  };

  // Get applications for this vacancy
  const vacancyApps = applications.filter((a) => a.vacancyId === vacancy.id);

  // Pair with candidate info by DNI
  const applicantRows = vacancyApps.map((app) => {
    const cand = candidates.find((c) => c.dni.trim() === app.candidateDni.trim());
    return {
      application: app,
      candidate: cand,
      dni: app.candidateDni,
      nombre: cand ? cand.nombre : 'Postulante',
      fecha: cand?.fecha || app.appliedAt.slice(0, 10),
      telefono: cand?.telefono || '',
      edad: cand?.edad || 0,
      cargo: cand?.actualUltimaPosicion || '',
      sector: cand?.sectorRubro || vacancy.sector,
      exp: cand?.aniosExperiencia || 0,
      sueldo: cand?.salarioActualUltimo || 0,
      ingles: cand?.inglesAvanzado || '',
      maestria: cand?.maestria || 'No menciona',
      tipoEmpresa: cand?.tipoEmpresa || 'Multinacional',
      customAnswers: app.customAnswers || cand?.customAnswers || {},
      linkCv: app.linkCv || cand?.linkCv || ''
    };
  });

  const filteredApplicants = applicantRows.filter((r) => {
    return (
      r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.dni.includes(searchTerm) ||
      r.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calculate Salary Thermometer using standardized parseSalaryNumber
  const salaries = applicantRows.map((r) => parseSalaryNumber(r.sueldo)).filter((s) => s > 0);
  const minSalary = salaries.length > 0 ? Math.min(...salaries) : 0;
  const maxSalary = salaries.length > 0 ? Math.max(...salaries) : 0;
  const avgSalary =
    salaries.length > 0 ? Math.round(salaries.reduce((acc, curr) => acc + curr, 0) / salaries.length) : 0;

  // English counts for this vacancy
  const englishYesCount = applicantRows.filter((r) =>
    ['Sí', 'Si', 'SI', 'Yes', 'Avanzado', 'Nativo', 'true', '1'].includes((r.ingles || '').trim())
  ).length;
  const englishNoCount = Math.max(0, applicantRows.length - englishYesCount);

  // Master's degree count: Any text that is not "No menciona", "No", etc. counts as having a master's degree
  const withMasterCount = applicantRows.filter((r) => hasMasterDegree(r.maestria)).length;
  const withoutMasterCount = Math.max(0, applicantRows.length - withMasterCount);

  // Company Type distribution for this vacancy
  const companyCounts = applicantRows.reduce((acc: Record<string, number>, r) => {
    const comp = r.tipoEmpresa || 'Otras';
    acc[comp] = (acc[comp] || 0) + 1;
    return acc;
  }, {});

  const companyTypeData = Object.entries(companyCounts).map(([name, value], i) => {
    const palette = ['#1B2A4A', '#0066CC', '#00A3E0', '#10B981', '#F59E0B', '#8B5CF6'];
    return { name, value, color: palette[i % palette.length] };
  }).sort((a, b) => b.value - a.value);

  // Export to Excel matching the exact columns structure (A to R) with Formula Injection hardening
  const handleExportToExcel = async () => {
    const rows = applicantRows.map((r) => {
      // 12 Base Columns A to L
      const baseRow: Record<string, any> = {
        Fecha: r.fecha,
        Nombre: r.nombre,
        DNI: r.dni,
        Teléfono: r.telefono,
        Edad: r.edad,
        'Actual o última posición': r.cargo,
        'Sector / Rubro': r.sector,
        'Años de experiencia': r.exp,
        'Salario actual o último salario': r.sueldo,
        'Inglés avanzado': r.ingles,
        Maestría: r.maestria,
        'Tipo de empresa': r.tipoEmpresa
      };

      // Intermediate custom question columns M to Q
      if (vacancy.customQuestions && vacancy.customQuestions.length > 0) {
        vacancy.customQuestions.forEach((q) => {
          baseRow[q.label] = r.customAnswers[q.id] || '-';
        });
      }

      // Final Column: Link del CV
      baseRow['Link del CV'] = r.linkCv;

      // Blindaje de seguridad Layer 2: Sanitización anti-fórmulas en cada celda
      return sanitizeRowForSpreadsheet(baseRow);
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, vacancy.folderName.slice(0, 31));
    XLSX.writeFile(workbook, `ATS_${vacancy.folderName}_Postulantes.xlsx`);

    // Blindaje de seguridad Layer 8: Registro de auditoría
    await storage.logAudit(
      'EXPORT_EXCEL_VACANCY',
      `Exportación segura de ${rows.length} postulantes de la vacante ${vacancy.code} (${vacancy.title}).`
    );
  };

  // Flujo Oficial de Google Sheets:
  // 1. Vacante creada desde plataforma (googleSheetFileId existe): Sincroniza postulantes con PATCH y abre la pestaña
  // 2. Proceso histórico CSV (isImportedHistorical: true): Prohibido crear archivos nuevos; abre link existente o carpeta
  const handleOpenAndSyncSheet = async () => {
    // CASO 2: Proceso pasado importado por CSV (PROHIBIDO crear ningún archivo nuevo en Drive)
    if (vacancy.isImportedHistorical || !vacancy.googleSheetFileId) {
      if (vacancy.googleSheetUrl) {
        window.open(safeExternalUrl(vacancy.googleSheetUrl), '_blank');
      } else if (vacancy.jobFolderUrl) {
        window.open(safeExternalUrl(vacancy.jobFolderUrl), '_blank');
      } else if (vacancy.cvsFolderUrl || vacancy.driveFolderUrl) {
        window.open(safeExternalUrl(vacancy.cvsFolderUrl || vacancy.driveFolderUrl), '_blank');
      } else {
        alert('Este proceso histórico no tiene configurado un enlace a Google Sheet ni Carpeta del Job.');
      }
      return;
    }

    // CASO 1: Vacante creada desde la plataforma (googleSheetFileId existe)
    // Abrir pestaña inmediatamente de forma síncrona para evitar bloqueo de pop-ups
    const newTab = window.open('about:blank', '_blank');
    if (newTab) {
      newTab.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sincronizando Google Sheet - ATS</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body {
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background-color: #0B132B;
                color: #FFFFFF;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .card {
                text-align: center;
                padding: 32px;
                max-width: 440px;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
              }
              .spinner {
                width: 42px;
                height: 42px;
                border: 3px solid rgba(255, 255, 255, 0.15);
                border-top-color: #10B981;
                border-radius: 50%;
                animation: spin 0.75s linear infinite;
                margin: 0 auto 20px auto;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              h2 { font-size: 1.15rem; font-weight: 700; margin: 0 0 8px 0; color: #FFFFFF; }
              p { font-size: 0.85rem; color: #94A3B8; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="spinner"></div>
              <h2>Sincronizando con Google Sheet Oficial</h2>
              <p>Actualizando postulantes en Google Drive y abriendo documento...</p>
            </div>
          </body>
        </html>
      `);
    }

    try {
      setIsSyncingSheet(true);

      // 12 Columnas Fijas Base (A-L) + Preguntas Personalizadas + Link CV
      const rows = applicantRows.map((r) => {
        const baseRow: Record<string, any> = {
          'Fecha': r.fecha,
          'Nombre': r.nombre,
          'DNI': r.dni,
          'Teléfono': r.telefono,
          'Edad': r.edad,
          'Actual o última posición': r.cargo,
          'Sector / Rubro': r.sector,
          'Años de experiencia': r.exp,
          'Salario actual o último salario': r.sueldo,
          'Inglés avanzado': r.ingles,
          'Maestría': r.maestria,
          'Tipo de empresa': r.tipoEmpresa
        };

        if (vacancy.customQuestions && vacancy.customQuestions.length > 0) {
          vacancy.customQuestions.forEach((q) => {
            baseRow[q.label] = r.customAnswers?.[q.id] || '-';
          });
        }

        baseRow['Link del CV'] = r.linkCv;
        return sanitizeRowForSpreadsheet(baseRow);
      });

      const headers = buildVacancyHeaders(vacancy.customQuestions);

      let worksheet;
      if (rows.length > 0) {
        worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      } else {
        worksheet = XLSX.utils.aoa_to_sheet([headers]);
      }

      const workbook = XLSX.utils.book_new();
      const sheetName = (vacancy.title || 'Postulantes').slice(0, 31).replace(/[\\/?*[\]]/g, '');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      const xlsxBase64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

      // PATCH sobre googleSheetFileId usando OAuth2 y binario XLSX sanitizado
      await syncGoogleSheetWithBinary({
        fileId: vacancy.googleSheetFileId,
        base64: xlsxBase64
      });

      const targetUrl = vacancy.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${vacancy.googleSheetFileId}/edit`;

      if (newTab && !newTab.closed) {
        newTab.location.href = targetUrl;
      } else {
        window.open(targetUrl, '_blank');
      }

      await storage.logAudit(
        'EXPORT_EXCEL_VACANCY',
        `Sincronización en Google Sheets de ${rows.length} postulantes de la vacante ${vacancy.code} (${vacancy.title}).`
      );
    } catch (err: any) {
      console.error('[Google Sheet Sync Error]:', err);
      const fallbackUrl = vacancy.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${vacancy.googleSheetFileId}/edit`;
      if (newTab && !newTab.closed) {
        newTab.location.href = fallbackUrl;
      } else {
        window.open(fallbackUrl, '_blank');
      }
    } finally {
      setIsSyncingSheet(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--ats-navy)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} color="#0066CC" />
          <span>Volver a Procesos 2026</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet size={15} color="#10B981" />}
            onClick={handleExportToExcel}
            disabled={applicantRows.length === 0}
          >
            Exportar Postulantes (.xlsx)
          </Button>

          <button
            onClick={handleSyncBiginStages}
            disabled={isSyncingBigin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #1D4ED8',
              backgroundColor: isSyncingBigin ? '#93C5FD' : '#1D4ED8',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: isSyncingBigin ? 'wait' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              transition: 'all 0.15s ease'
            }}
            title="Sincroniza en tiempo real las etapas reales de cada candidato desde el CRM Zoho Bigin"
          >
            <span>{isSyncingBigin ? 'Sincronizando con Bigin...' : '🔄 Actualizar Pipeline desde Bigin (Vista Cliente)'}</span>
          </button>

          <button
            onClick={handleOpenAndSyncSheet}
            disabled={isSyncingSheet}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #059669',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: isSyncingSheet ? 'wait' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            title={
              vacancy.googleSheetFileId
                ? 'Sincronizar y Abrir Google Sheet oficial en Google Drive'
                : vacancy.googleSheetUrl
                ? 'Abrir Google Sheet histórico existente'
                : 'Abrir Carpeta en Google Drive'
            }
          >
            <FileSpreadsheet size={14} color="#FFFFFF" />
            <span>
              {isSyncingSheet
                ? 'Sincronizando...'
                : vacancy.googleSheetFileId
                ? 'Google Sheet del Job'
                : vacancy.googleSheetUrl
                ? 'Sheet Histórico'
                : 'Ver en Drive'}
            </span>
            <ExternalLink size={12} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* Alerta de Sincronización con Bigin */}
      {biginSyncFeedback && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            backgroundColor: biginSyncFeedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border:
              biginSyncFeedback.type === 'success' ? '1px solid #BBF7D0' : '1px solid #FECACA',
            color: biginSyncFeedback.type === 'success' ? '#15803D' : '#B91C1C',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{biginSyncFeedback.text}</span>
          <button
            onClick={() => setBiginSyncFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Card */}
      <Card padding="lg" style={{ borderLeft: '5px solid var(--ats-blue)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--ats-blue)' }}>
                {vacancy.code}
              </span>
              <Badge variant="navy">{vacancy.sector}</Badge>
              <select
                className="ats-select"
                style={{
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: 6,
                  cursor: 'pointer',
                  backgroundColor:
                    vacancyStatus === 'active'
                      ? '#ECFDF5'
                      : vacancyStatus === 'paused'
                      ? '#FEF3C7'
                      : '#F1F5F9',
                  color:
                    vacancyStatus === 'active'
                      ? '#065F46'
                      : vacancyStatus === 'paused'
                      ? '#92400E'
                      : '#475569',
                  border: '1px solid rgba(0,0,0,0.08)'
                }}
                value={vacancyStatus}
                onChange={(e) => handleVacancyStatusChange(e.target.value as VacancyStatus)}
              >
                <option value="active">● Puesto Activo (Visible en Web)</option>
                <option value="paused">● Pausado</option>
                <option value="closed">● Cerrado / Histórico 2026</option>
              </select>
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ats-navy)', margin: '0 0 6px 0' }}>
              {vacancy.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.85rem', color: 'var(--ats-text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Folder size={14} color="#0066CC" />
                <span>Carpeta Asignada: <strong>{vacancy.folderName}</strong></span>
              </div>
              {vacancy.driveFolderUrl && (
                <a
                  href={safeExternalUrl(vacancy.driveFolderUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066CC', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                >
                  <ExternalLink size={12} />
                  <span>Ver Carpeta en Google Drive</span>
                </a>
              )}
            </div>

            {/* Action Bar: Copiar Link, Abrir Formulario, Carpeta del Job y Carpeta de CVs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <button
                onClick={handleCopyLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--ats-border)',
                  backgroundColor: copied ? '#ECFDF5' : '#FFFFFF',
                  color: copied ? '#059669' : 'var(--ats-navy)',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {copied ? <Check size={14} color="#059669" /> : <Copy size={14} color="#0066CC" />}
                <span>{copied ? '¡Link Copiado al Portapapeles!' : 'Copiar Link del Formulario'}</span>
              </button>

              <button
                onClick={handleOpenForm}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #BFDBFE',
                  backgroundColor: '#EFF6FF',
                  color: '#0066CC',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer'
                }}
              >
                <span>Abrir Formulario</span>
                <ExternalLink size={13} />
              </button>

              {/* Botón 1: Carpeta donde está el Job */}
              {vacancy.jobFolderUrl ? (
                <a
                  href={safeExternalUrl(vacancy.jobFolderUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px solid #C7D2FE',
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                  title="Abrir carpeta / perfil del puesto en Google Drive"
                >
                  <Folder size={14} color="#4338CA" />
                  <span>Carpeta del Job (Drive)</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span
                  title="Sin enlace de carpeta del Job"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px dashed #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#94A3B8',
                    fontSize: '0.825rem'
                  }}
                >
                  <Folder size={14} />
                  <span>Sin Carpeta del Job</span>
                </span>
              )}

              {/* Botón 2: Carpeta de los CVs */}
              {(vacancy.cvsFolderUrl || vacancy.driveFolderUrl) ? (
                <a
                  href={safeExternalUrl(vacancy.cvsFolderUrl || vacancy.driveFolderUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px solid #A7F3D0',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                  title="Abrir carpeta de CVs de postulantes en Google Drive"
                >
                  <Folder size={14} color="#047857" />
                  <span>Carpeta de CVs (Drive)</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span
                  title="Sin enlace de carpeta de CVs"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px dashed #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#94A3B8',
                    fontSize: '0.825rem'
                  }}
                >
                  <Folder size={14} />
                  <span>Sin Carpeta de CVs</span>
                </span>
              )}

              {/* Botón 3: Google Sheet del Job (Sincronizar y Abrir / Abrir Histórico) */}
              <button
                onClick={handleOpenAndSyncSheet}
                disabled={isSyncingSheet}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #6EE7B7',
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: isSyncingSheet ? 'wait' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
                title={
                  vacancy.googleSheetFileId
                    ? 'Actualiza los postulantes en Google Drive y abre el archivo oficial'
                    : vacancy.googleSheetUrl
                    ? 'Abre el Google Sheet existente de este proceso histórico'
                    : 'Abre la carpeta del puesto en Drive donde reside su archivo histórico'
                }
              >
                <FileSpreadsheet size={14} color="#059669" />
                <span>
                  {isSyncingSheet
                    ? 'Sincronizando...'
                    : vacancy.googleSheetFileId
                    ? 'Google Sheet Oficial'
                    : vacancy.googleSheetUrl
                    ? 'Sheet Histórico (Drive)'
                    : 'Carpeta en Drive'}
                </span>
                <ExternalLink size={12} color="#059669" />
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ats-navy)' }}>
              {applicantRows.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ats-text-muted)' }}>Postulantes Registrados</div>
          </div>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid var(--ats-border)', paddingTop: 16 }}>
          <button
            onClick={() => setActiveTab('candidates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'candidates' ? 'var(--ats-blue)' : '#F1F5F9',
              color: activeTab === 'candidates' ? '#FFF' : 'var(--ats-text-secondary)'
            }}
          >
            <Users size={16} />
            <span>Candidatos del Puesto ({applicantRows.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'stats' ? 'var(--ats-blue)' : '#F1F5F9',
              color: activeTab === 'stats' ? '#FFF' : 'var(--ats-text-secondary)'
            }}
          >
            <BarChart3 size={16} />
            <span>Termómetro Salarial & Preguntas Personalizadas</span>
          </button>
        </div>
      </Card>

      {/* TAB 1: CANDIDATES LIST */}
      {activeTab === 'candidates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '12px 18px',
              borderRadius: 10,
              border: '1px solid var(--ats-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ position: 'relative', width: 320 }}>
              <Search
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="ats-input"
                style={{ paddingLeft: 38, paddingBottom: 6, paddingTop: 6 }}
                placeholder="Buscar por DNI, nombre o cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ats-text-muted)' }}>
              Mostrando {filteredApplicants.length} de {applicantRows.length} postulantes
            </div>
          </div>

          {filteredApplicants.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--ats-text-muted)' }}>No hay postulantes registrados para este puesto aún.</p>
            </Card>
          ) : (
            <div className="ats-table-container">
              <table className="ats-table" style={{ fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nombre Completo</th>
                    <th>DNI</th>
                    <th>Teléfono</th>
                    <th>Edad</th>
                    <th>Última Posición</th>
                    <th>Sueldo Actual/Último</th>
                    <th>Inglés</th>
                    <th>Maestría</th>
                    {vacancy.customQuestions?.map((q) => (
                      <th key={q.id}>{q.label}</th>
                    ))}
                    <th>Link del CV</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicants.map((r, i) => {
                    const cleanPhone = r.telefono.replace(/[^0-9]/g, '');
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--ats-navy)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span>{r.nombre}</span>
                            {r.application.biginStage && (
                              <span
                                style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  color: '#1D4ED8',
                                  backgroundColor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: 4,
                                  padding: '1px 5px',
                                  display: 'inline-block',
                                  width: 'fit-content'
                                }}
                              >
                                Bigin: {r.application.biginStage}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ats-blue)' }}>{r.dni}</td>
                        <td>
                          {r.telefono ? (
                            <a
                              href={safeExternalUrl(`https://wa.me/${cleanPhone}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 600 }}
                            >
                              <MessageSquare size={13} />
                              <span>{r.telefono}</span>
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{r.edad || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{r.cargo}</td>
                        <td style={{ fontWeight: 700, color: 'var(--ats-blue)' }}>
                          {typeof r.sueldo === 'number'
                            ? (r.sueldo > 0 ? `S/. ${r.sueldo.toLocaleString('es-PE')}` : '-')
                            : String(r.sueldo || '-')}
                        </td>
                        <td><Badge variant="cyan">{r.ingles || 'N/A'}</Badge></td>
                        <td>
                          {hasMasterDegree(r.maestria) ? (
                            <span style={{ color: '#065F46', fontWeight: 600 }}>✓ {r.maestria}</span>
                          ) : (
                            <span style={{ color: 'var(--ats-text-muted)' }}>{r.maestria || 'No menciona'}</span>
                          )}
                        </td>

                        {/* Intermediate Custom Question Answers */}
                        {vacancy.customQuestions?.map((q) => (
                          <td key={q.id} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {String(r.customAnswers[q.id] || '-')}
                          </td>
                        ))}

                        {/* Link del CV */}
                        <td>
                          {r.linkCv && r.linkCv.startsWith('http') ? (
                            <a
                              href={safeExternalUrl(r.linkCv)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ats-btn ats-btn-sm"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                backgroundColor: isGoogleDriveLink(r.linkCv) ? '#0284C7' : 'var(--ats-blue)',
                                color: '#FFF',
                                border: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title={isGoogleDriveLink(r.linkCv) ? 'Abrir archivo en Google Drive Corporativo' : 'Abrir enlace de CV'}
                            >
                              <ExternalLink size={12} />
                              <span>{isGoogleDriveLink(r.linkCv) ? 'Drive CV' : 'Abrir CV'}</span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--ats-text-muted)', fontSize: '0.75rem' }}>
                              {r.linkCv || `En carpeta: ${vacancy.folderName || 'General'}`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: POSITION STATS & SALARY THERMOMETER */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Termómetro Salarial Visual */}
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <DollarSign size={22} color="#0066CC" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--ats-navy)' }}>
                    Termómetro Salarial del Puesto
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ats-text-muted)' }}>
                    Expectativas salariales mensuales reales reportadas por los {applicantRows.length} postulantes
                  </p>
                </div>
              </div>
              <Badge variant="blue">Compensación 2026</Badge>
            </div>

            {applicantRows.length === 0 ? (
              <p style={{ color: 'var(--ats-text-muted)' }}>No hay datos suficientes para calcular estadísticas.</p>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <div style={{ padding: 16, borderRadius: 10, backgroundColor: '#F8FAFC', textAlign: 'center', border: '1px solid var(--ats-border)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ats-text-muted)', textTransform: 'uppercase' }}>
                      Sueldo Mínimo
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00A3E0', marginTop: 4 }}>
                      S/. {minSalary.toLocaleString('es-PE')}
                    </div>
                  </div>

                  <div style={{ padding: 16, borderRadius: 10, backgroundColor: 'var(--ats-blue-light)', textAlign: 'center', border: '1px solid rgba(0, 102, 204, 0.25)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ats-blue)', textTransform: 'uppercase' }}>
                      Sueldo Promedio
                    </span>
                    <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--ats-blue)', marginTop: 4 }}>
                      S/. {avgSalary.toLocaleString('es-PE')}
                    </div>
                  </div>

                  <div style={{ padding: 16, borderRadius: 10, backgroundColor: '#F8FAFC', textAlign: 'center', border: '1px solid var(--ats-border)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ats-text-muted)', textTransform: 'uppercase' }}>
                      Sueldo Máximo
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ats-navy)', marginTop: 4 }}>
                      S/. {maxSalary.toLocaleString('es-PE')}
                    </div>
                  </div>
                </div>

                {/* Termómetro Visual con marcadores */}
                <div style={{ position: 'relative', margin: '20px 0 10px 0' }}>
                  <div style={{ backgroundColor: '#E2E8F0', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #00A3E0 0%, #0066CC 50%, #1B2A4A 100%)', borderRadius: 6 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--ats-text-muted)', marginTop: 6 }}>
                    <span>Piso: S/. {minSalary.toLocaleString('es-PE')}</span>
                    <span style={{ fontWeight: 700, color: 'var(--ats-blue)' }}>Media: S/. {avgSalary.toLocaleString('es-PE')}</span>
                    <span>Techo: S/. {maxSalary.toLocaleString('es-PE')}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Gráficos Base del Puesto: Inglés, Maestría y Tipo de Empresa */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {/* Dona de Inglés Avanzado (Sí vs No) */}
            <Card padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Languages size={18} color="#0066CC" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ats-navy)' }}>
                  Inglés Avanzado (Sí / No)
                </h4>
              </div>

              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Sí', value: englishYesCount, color: '#10B981' },
                        { name: 'No', value: englishNoCount, color: '#94A3B8' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#94A3B8" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111D36', borderRadius: 6, color: '#FFF', fontSize: '0.8rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: '0.8rem', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span>Sí: <strong>{englishYesCount} ({applicantRows.length > 0 ? Math.round((englishYesCount / applicantRows.length) * 100) : 0}%)</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                  <span>No: <strong>{englishNoCount} ({applicantRows.length > 0 ? Math.round((englishNoCount / applicantRows.length) * 100) : 0}%)</strong></span>
                </div>
              </div>
            </Card>

            {/* Dona de Maestría (Con vs Sin) */}
            <Card padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <GraduationCap size={18} color="#0066CC" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ats-navy)' }}>
                  Grado de Maestría / MBA
                </h4>
              </div>

              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Con Maestría', value: withMasterCount, color: '#0066CC' },
                        { name: 'Sin Maestría', value: withoutMasterCount, color: '#F59E0B' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#0066CC" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111D36', borderRadius: 6, color: '#FFF', fontSize: '0.8rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: '0.8rem', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#0066CC' }} />
                  <span>Con Maestría: <strong>{withMasterCount}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <span>Sin Maestría: <strong>{withoutMasterCount}</strong></span>
                </div>
              </div>
            </Card>

            {/* Barra: Tipo de Empresa */}
            <Card padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Building size={18} color="#1B2A4A" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ats-navy)' }}>
                  Tipo de Empresa de Origen
                </h4>
              </div>

              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companyTypeData.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#1B2A4A" fontSize={10} width={80} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111D36', borderRadius: 6, color: '#FFF', fontSize: '0.8rem' }}
                      formatter={(v: any) => [`${v} candidatos`, 'Total']}
                    />
                    <Bar dataKey="value" fill="#0066CC" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', textAlign: 'center', marginTop: 4 }}>
                Total empresas analizadas en la terna
              </div>
            </Card>
          </div>

          {/* REQUISITO 5B: SECCIÓN "ANÁLISIS DE PREGUNTAS ESPECÍFICAS DEL PUESTO" */}
          {vacancy.customQuestions && vacancy.customQuestions.length > 0 ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--ats-navy)' }}>
                  Análisis de Preguntas Específicas del Puesto ({vacancy.customQuestions.length})
                </h3>
                <Badge variant="cyan">Gráficos de Preguntas Dinámicas</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
                {vacancy.customQuestions.map((q, qIdx) => {
                  // Agrupar respuestas de los candidatos para esta pregunta
                  const answerGroups: Record<string, number> = {};
                  let answeredCount = 0;

                  applicantRows.forEach((r) => {
                    const raw = String(r.customAnswers[q.id] || '').trim();
                    if (raw) {
                      answeredCount++;
                      // Normalizar mayúsculas para agrupar ej. "Sí", "SI", "si"
                      const normKey = raw.length <= 15 ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : raw;
                      answerGroups[normKey] = (answerGroups[normKey] || 0) + 1;
                    } else {
                      answerGroups['Sin respuesta'] = (answerGroups['Sin respuesta'] || 0) + 1;
                    }
                  });

                  const palette = ['#0066CC', '#00A3E0', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E', '#64748B'];
                  const chartData = Object.entries(answerGroups)
                    .map(([name, value], i) => ({
                      name: name.length > 25 ? name.slice(0, 25) + '...' : name,
                      fullName: name,
                      value,
                      color: palette[i % palette.length]
                    }))
                    .sort((a, b) => b.value - a.value);

                  const isFewCategories = chartData.length <= 4;

                  return (
                    <Card key={q.id} padding="lg" style={{ borderLeft: '4px solid var(--ats-blue)' }}>
                      <div style={{ marginBottom: 12 }}>
                        <Badge variant="navy" style={{ fontSize: '0.72rem', marginBottom: 6 }}>
                          Pregunta #{qIdx + 1}
                        </Badge>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ats-navy)', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                          {q.label}
                        </h4>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ats-text-muted)' }}>
                          {answeredCount} de {applicantRows.length} postulantes respondieron ({applicantRows.length > 0 ? Math.round((answeredCount / applicantRows.length) * 100) : 0}%)
                        </div>
                      </div>

                      {chartData.length === 0 ? (
                        <p style={{ color: 'var(--ats-text-muted)', fontSize: '0.85rem' }}>Sin datos registrados.</p>
                      ) : isFewCategories ? (
                        /* Si son pocas categorías: Donut Chart */
                        <div>
                          <div style={{ width: '100%', height: 190 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={70}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {chartData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#111D36', borderRadius: 6, color: '#FFF', fontSize: '0.8rem' }}
                                  formatter={(val: any, name: any, item: any) => [`${val} candidatos (${Math.round((val / (applicantRows.length || 1)) * 100)}%)`, item.payload.fullName]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, fontSize: '0.78rem', marginTop: 8 }}>
                            {chartData.map((item) => (
                              <div key={item.fullName} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
                                <span>{item.name}: <strong>{item.value} ({Math.round((item.value / (applicantRows.length || 1)) * 100)}%)</strong></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Si son varias respuestas: BarChart Horizontal */
                        <div>
                          <div style={{ width: '100%', height: 210 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={chartData.slice(0, 6)}
                                layout="vertical"
                                margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                                <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
                                <YAxis dataKey="name" type="category" stroke="#1B2A4A" fontSize={10} width={95} tickLine={false} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#111D36', borderRadius: 6, color: '#FFF', fontSize: '0.8rem' }}
                                  formatter={(v: any, n: any, item: any) => [`${v} candidatos (${Math.round((v / (applicantRows.length || 1)) * 100)}%)`, item.payload.fullName]}
                                />
                                <Bar dataKey="value" fill="#0066CC" radius={[0, 4, 4, 0]} barSize={16}>
                                  {chartData.map((entry, idx) => (
                                    <Cell key={`bar-${idx}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {chartData.slice(0, 5).map((item) => (
                              <Badge key={item.fullName} variant="blue" style={{ fontSize: '0.72rem' }}>
                                {item.name}: {item.value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card padding="md" style={{ textAlign: 'center', padding: '30px' }}>
              <p style={{ color: 'var(--ats-text-muted)', margin: 0, fontSize: '0.875rem' }}>
                Este puesto no tiene preguntas personalizadas adicionales registradas.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
