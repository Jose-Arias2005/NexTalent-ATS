import React, { useState, useMemo } from 'react';
import { AdminUser, Vacancy2026, Candidate2026, Application2026 } from '../../types';
import { Logo } from '../../components/ui/Logo';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { syncPipelineStagesFromBigin } from '../../lib/biginService';
import { hasMasterDegree, parseSalaryNumber } from '../../lib/analyticsUtils';
import { safeExternalUrl } from '../../lib/security';
import {
  Users,
  Award,
  DollarSign,
  Languages,
  Briefcase,
  FileText,
  ExternalLink,
  RotateCw,
  LogOut,
  BarChart3,
  Layers,
  Search,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface ClientPortalViewProps {
  currentUser: AdminUser;
  vacancies: Vacancy2026[];
  candidates: Candidate2026[];
  applications: Application2026[];
  onLogout: () => void;
  onRefresh: () => void;
}

interface PipelineColumnDef {
  id: string;
  title: string;
  color: string;
  bgHeader: string;
  borderHeader: string;
}

const STAGE_PALETTE = [
  { color: '#475569', bgHeader: '#F1F5F9', borderHeader: '#CBD5E1' },
  { color: '#0284C7', bgHeader: '#F0F9FF', borderHeader: '#BAE6FD' },
  { color: '#4F46E5', bgHeader: '#EEF2FF', borderHeader: '#C7D2FE' },
  { color: '#D97706', bgHeader: '#FFFBEB', borderHeader: '#FDE68A' },
  { color: '#059669', bgHeader: '#ECFDF5', borderHeader: '#A7F3D0' },
  { color: '#8B5CF6', bgHeader: '#F5F3FF', borderHeader: '#DDD6FE' },
  { color: '#E11D48', bgHeader: '#FFF1F2', borderHeader: '#FECDD3' }
];

const BIGIN_PIPELINE_COLUMNS: PipelineColumnDef[] = [
  {
    id: 'Preseleccionados',
    title: 'Preseleccionados',
    color: '#475569',
    bgHeader: '#F1F5F9',
    borderHeader: '#CBD5E1'
  },
  {
    id: 'Evaluación de candidatos',
    title: 'Evaluación de Candidatos',
    color: '#0284C7',
    bgHeader: '#F0F9FF',
    borderHeader: '#BAE6FD'
  },
  {
    id: 'Proceso de entrevista',
    title: 'Proceso de Entrevista',
    color: '#4F46E5',
    bgHeader: '#EEF2FF',
    borderHeader: '#C7D2FE'
  },
  {
    id: 'Ofertado',
    title: 'Ofertado / Finalistas',
    color: '#D97706',
    bgHeader: '#FFFBEB',
    borderHeader: '#FDE68A'
  },
  {
    id: 'Contratado',
    title: 'Contratado',
    color: '#059669',
    bgHeader: '#ECFDF5',
    borderHeader: '#A7F3D0'
  },
  {
    id: 'Rechazado',
    title: 'Rechazado / Descartado',
    color: '#E11D48',
    bgHeader: '#FFF1F2',
    borderHeader: '#FECDD3'
  }
];

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  currentUser,
  vacancies,
  candidates,
  applications,
  onLogout,
  onRefresh
}) => {
  // 1. Filtrar únicamente las vacantes autorizadas para esta empresa cliente
  const assignedIds = currentUser.assignedVacancyIds || [];
  const clientVacancies = vacancies.filter((v) => assignedIds.includes(v.id));

  const [selectedVacancyId, setSelectedVacancyId] = useState<string>(
    clientVacancies[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'kanban' | 'analytics'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Ficha Ejecutiva del Candidato
  const [selectedCandidateRow, setSelectedCandidateRow] = useState<{
    app: Application2026;
    cand?: Candidate2026;
  } | null>(null);

  const currentVacancy =
    clientVacancies.find((v) => v.id === selectedVacancyId) || clientVacancies[0];

  // 2. Obtener aplicaciones y candidatos del proceso seleccionado
  const currentApps = useMemo(() => {
    if (!currentVacancy) return [];
    return applications.filter((a) => a.vacancyId === currentVacancy.id);
  }, [applications, currentVacancy]);

  const applicantRows = useMemo(() => {
    return currentApps.map((app) => {
      const cand = candidates.find(
        (c) => c.dni.trim().toUpperCase() === app.candidateDni.trim().toUpperCase()
      );
      return { app, cand };
    });
  }, [currentApps, candidates]);

  // Filtrado por buscador
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return applicantRows;
    const term = searchTerm.toLowerCase();
    return applicantRows.filter((item) => {
      const name = item.cand?.nombre.toLowerCase() || '';
      const dni = item.app.candidateDni.toLowerCase();
      const pos = item.cand?.actualUltimaPosicion.toLowerCase() || '';
      return name.includes(term) || dni.includes(term) || pos.includes(term);
    });
  }, [applicantRows, searchTerm]);

  // Columnas dinámicas: se acomodan según las etapas del pipeline de la empresa o el fallback estándar de 6 fases
  const pipelineColumns = useMemo<PipelineColumnDef[]>(() => {
    if (currentVacancy?.biginStages && currentVacancy.biginStages.length > 0) {
      return currentVacancy.biginStages.map((stageName, idx) => {
        const theme = STAGE_PALETTE[idx % STAGE_PALETTE.length];
        return {
          id: stageName,
          title: stageName,
          color: theme.color,
          bgHeader: theme.bgHeader,
          borderHeader: theme.borderHeader
        };
      });
    }
    return BIGIN_PIPELINE_COLUMNS;
  }, [currentVacancy]);

  // Clasificador de candidatos por columna según las etapas del pipeline
  const getCandidateColumn = (app: Application2026): string => {
    if (app.biginStage) {
      const stageLower = app.biginStage.toLowerCase().trim();
      const exact = pipelineColumns.find(
        (c) => c.id.toLowerCase().trim() === stageLower
      );
      if (exact) return exact.id;

      const partial = pipelineColumns.find((c) => {
        const colLower = c.id.toLowerCase().trim();
        return stageLower.includes(colLower) || colLower.includes(stageLower);
      });
      if (partial) return partial.id;

      if (stageLower.includes('preseleccionado')) return pipelineColumns[0]?.id || 'Preseleccionados';
      if (stageLower.includes('evaluación') || stageLower.includes('evaluacion')) return pipelineColumns[1]?.id || 'Evaluación de candidatos';
      if (stageLower.includes('entrevista')) return pipelineColumns[2]?.id || 'Proceso de entrevista';
      if (stageLower.includes('ofertado') || stageLower.includes('propuesta') || stageLower.includes('shortlist') || stageLower.includes('finalista')) return pipelineColumns[3]?.id || 'Ofertado';
      if (stageLower.includes('contratado')) return pipelineColumns[4]?.id || 'Contratado';
      if (stageLower.includes('rechazado') || stageLower.includes('descartado')) return pipelineColumns[pipelineColumns.length - 1]?.id || 'Rechazado';
      return pipelineColumns[0]?.id || 'Preseleccionados';
    }

    // Fallback según status de la aplicación
    switch (app.status) {
      case 'recibido':
      case 'revision':
        return pipelineColumns[0]?.id || 'Preseleccionados';
      case 'en_revision':
        return pipelineColumns[1]?.id || pipelineColumns[0]?.id;
      case 'entrevista':
        return pipelineColumns[2]?.id || pipelineColumns[1]?.id || pipelineColumns[0]?.id;
      case 'terna':
      case 'shortlist':
      case 'seleccionado':
        return pipelineColumns[3]?.id || pipelineColumns[2]?.id;
      case 'contratado':
        return pipelineColumns[4]?.id || pipelineColumns[3]?.id;
      case 'descartado':
        return pipelineColumns[pipelineColumns.length - 1]?.id;
      default:
        return pipelineColumns[0]?.id || 'Preseleccionados';
    }
  };

  // 3. Métricas y KPIs Ejecutivos
  const totalCandidates = applicantRows.length;

  const inInterviewCount = applicantRows.filter(
    (item) => getCandidateColumn(item.app) === 'Proceso de entrevista'
  ).length;

  const offeredOrHiredCount = applicantRows.filter(
    (item) =>
      getCandidateColumn(item.app) === 'Ofertado' ||
      getCandidateColumn(item.app) === 'Contratado'
  ).length;

  const advancedEnglishCount = applicantRows.filter(
    (item) => item.cand?.inglesAvanzado === 'Sí'
  ).length;
  const advancedEnglishPercent = totalCandidates > 0 ? Math.round((advancedEnglishCount / totalCandidates) * 100) : 0;

  const masterDegreeCount = applicantRows.filter(
    (item) => hasMasterDegree(item.cand?.maestria || '')
  ).length;
  const masterDegreePercent = totalCandidates > 0 ? Math.round((masterDegreeCount / totalCandidates) * 100) : 0;

  const averageSalary = useMemo(() => {
    const salaries = applicantRows
      .map((item) => parseSalaryNumber(item.cand?.salarioActualUltimo))
      .filter((s): s is number => s !== null && s > 0);
    if (salaries.length === 0) return 0;
    const sum = salaries.reduce((a, b) => a + b, 0);
    return Math.round(sum / salaries.length);
  }, [applicantRows]);

  // Sincronización en vivo desde Bigin CRM
  const handleSyncLivePipeline = async () => {
    if (!currentVacancy) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncPipelineStagesFromBigin(currentVacancy);
      if (res.success) {
        setSyncMessage({
          type: 'success',
          text: `✓ Pipeline actualizado en vivo: ${res.syncedCount} candidato(s) sincronizados con las etapas reales de Bigin CRM.`
        });
        onRefresh();
      } else {
        setSyncMessage({
          type: 'error',
          text: `Error al actualizar desde Bigin: ${res.error || 'No se pudo conectar'}`
        });
      }
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: `Error de conexión: ${err?.message || err}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Datos para gráficos de analítica
  const salaryBracketsData = useMemo(() => {
    const brackets: Record<string, number> = {
      'Menos de S/ 8k': 0,
      'S/ 8k - 14k': 0,
      'S/ 14k - 20k': 0,
      'S/ 20k - 30k': 0,
      'Más de S/ 30k': 0
    };

    applicantRows.forEach((item) => {
      const s = parseSalaryNumber(item.cand?.salarioActualUltimo);
      if (!s || s <= 0) return;
      if (s < 8000) brackets['Menos de S/ 8k']++;
      else if (s <= 14000) brackets['S/ 8k - 14k']++;
      else if (s <= 20000) brackets['S/ 14k - 20k']++;
      else if (s <= 30000) brackets['S/ 20k - 30k']++;
      else brackets['Más de S/ 30k']++;
    });

    return Object.entries(brackets).map(([name, count]) => ({ name, count }));
  }, [applicantRows]);

  const pipelineStageCounts = useMemo(() => {
    return pipelineColumns.map((col) => {
      const count = applicantRows.filter((item) => getCandidateColumn(item.app) === col.id).length;
      return { name: col.title, count, color: col.color };
    });
  }, [applicantRows, pipelineColumns]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* Swiss Executive Luxury Header */}
      <header
        style={{
          backgroundColor: '#0A1120',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#FFFFFF',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Logo size="md" variant="light" />
          <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                backgroundColor: 'rgba(0, 82, 204, 0.25)',
                border: '1px solid #0052CC',
                color: '#60A5FA',
                padding: '4px 10px',
                borderRadius: 4,
                textTransform: 'uppercase'
              }}
            >
              PORTAL EJECUTIVO // {currentUser.companyName || 'EMPRESA CLIENTE'}
            </span>
          </div>
        </div>

        {/* Process Selector (si la empresa tiene múltiples puestos asignados) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {clientVacancies.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>Proceso:</span>
              <select
                className="ats-select"
                style={{
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  borderColor: '#334155',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 6
                }}
                value={selectedVacancyId}
                onChange={(e) => setSelectedVacancyId(e.target.value)}
              >
                {clientVacancies.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSyncLivePipeline}
            disabled={isSyncing || !currentVacancy}
            style={{
              backgroundColor: '#0052CC',
              border: '1px solid #3B82F6',
              color: '#FFFFFF',
              borderRadius: 6,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: isSyncing ? 'wait' : 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Consulta las etapas actualizadas en vivo desde Bigin CRM"
          >
            <RotateCw size={14} className={isSyncing ? 'spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Actualizar Pipeline en Vivo'}</span>
          </button>

          <button
            onClick={onLogout}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94A3B8',
              borderRadius: 6,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
            title="Cerrar sesión segura del portal corporativo"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ padding: '28px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1600, width: '100%', margin: '0 auto' }}>
        {/* Banner de Sincronización */}
        {syncMessage && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 8,
              backgroundColor: syncMessage.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              border:
                syncMessage.type === 'success' ? '1px solid #BBF7D0' : '1px solid #FECACA',
              color: syncMessage.type === 'success' ? '#15803D' : '#B91C1C',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{syncMessage.text}</span>
            <button
              onClick={() => setSyncMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Vacancy Info */}
        {currentVacancy ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#0052CC',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      padding: '2px 8px',
                      borderRadius: 4
                    }}
                  >
                    {currentVacancy.code}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '2px 8px',
                      borderRadius: 4
                    }}
                  >
                    ● Proceso Activo
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                    {currentVacancy.sector} // {currentVacancy.modality}
                  </span>
                </div>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0A1120', margin: 0, letterSpacing: '-0.02em' }}>
                  {currentVacancy.title}
                </h1>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#64748B', maxWidth: 840, lineHeight: 1.5 }}>
                  {currentVacancy.description}
                </p>
              </div>

              {/* Botón Sheet Histórico o Enlace a Drive si existe */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {currentVacancy.googleSheetUrl && (
                  <a
                    href={safeExternalUrl(currentVacancy.googleSheetUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      padding: '8px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    <FileText size={14} color="#059669" />
                    <span>Hoja Google Sheet</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Sub-Tabs: Kanban vs Analytics */}
            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
              <button
                onClick={() => setActiveTab('kanban')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  backgroundColor: activeTab === 'kanban' ? '#0A1120' : '#F1F5F9',
                  color: activeTab === 'kanban' ? '#FFFFFF' : '#64748B',
                  transition: 'all 0.15s ease'
                }}
              >
                <Layers size={15} />
                <span>Tablero Pipeline (Espejo Bigin)</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  backgroundColor: activeTab === 'analytics' ? '#0A1120' : '#F1F5F9',
                  color: activeTab === 'analytics' ? '#FFFFFF' : '#64748B',
                  transition: 'all 0.15s ease'
                }}
              >
                <BarChart3 size={15} />
                <span>Analítica & Compensación del Proceso</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center'
            }}
          >
            <ShieldCheck size={48} color="#94A3B8" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0A1120', margin: '0 0 8px 0' }}>
              Sin Procesos Asignados
            </h3>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
              Tu cuenta corporativa aún no tiene puestos asignados para auditoría. Por favor contacta a tu consultor principal de selección ejecutiva.
            </p>
          </div>
        )}

        {currentVacancy && (
          <>
            {/* Top KPIs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Total Postulantes</span>
                  <Users size={16} color="#0052CC" />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0A1120', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  {totalCandidates}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>En base de este proceso</div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>En Entrevistas</span>
                  <Briefcase size={16} color="#4F46E5" />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#4F46E5', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  {inInterviewCount}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Fase activa con consultor</div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Finalistas / Ofertados</span>
                  <Award size={16} color="#D97706" />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  {offeredOrHiredCount}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Etapas decisivas</div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Sueldo Promedio</span>
                  <DollarSign size={16} color="#059669" />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  {averageSalary > 0 ? `S/ ${averageSalary.toLocaleString('es-PE')}` : 'Por definir'}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Expectativa declarada</div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Calificación Clave</span>
                  <Languages size={16} color="#0284C7" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1120', marginTop: 6 }}>
                  {advancedEnglishPercent}% Inglés / {masterDegreePercent}% MBA
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Nivel avanzado / Postgrado</div>
              </div>
            </div>

            {/* TAB 1: KANBAN BOARD */}
            {activeTab === 'kanban' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Search input bar */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
                    <Search
                      size={15}
                      color="#94A3B8"
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      className="ats-input"
                      placeholder="Buscar por nombre, cargo o DNI..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: 34, fontSize: 12, height: 34 }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    Mostrando <strong>{filteredRows.length}</strong> de <strong>{totalCandidates}</strong> candidatos
                  </div>
                </div>

                {/* Dynamic Kanban Board adaptativo */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${pipelineColumns.length}, minmax(240px, 1fr))`,
                    gap: 14,
                    overflowX: 'auto',
                    paddingBottom: 16
                  }}
                >
                  {pipelineColumns.map((col) => {
                    const colCandidates = filteredRows.filter(
                      (item) => getCandidateColumn(item.app) === col.id
                    );

                    return (
                      <div
                        key={col.id}
                        style={{
                          backgroundColor: '#F1F5F9',
                          borderRadius: 10,
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: 520
                        }}
                      >
                        {/* Column Header */}
                        <div
                          style={{
                            padding: '12px 14px',
                            backgroundColor: col.bgHeader,
                            borderTopLeftRadius: 9,
                            borderTopRightRadius: 9,
                            borderBottom: `2px solid ${col.borderHeader}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: col.color, letterSpacing: '-0.01em' }}>
                            {col.title}
                          </span>
                          <span
                            style={{
                              backgroundColor: '#FFFFFF',
                              color: col.color,
                              border: `1px solid ${col.borderHeader}`,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 12
                            }}
                          >
                            {colCandidates.length}
                          </span>
                        </div>

                        {/* Cards Container */}
                        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
                          {colCandidates.length === 0 ? (
                            <div style={{ padding: '24px 10px', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                              Sin candidatos en esta etapa
                            </div>
                          ) : (
                            colCandidates.map(({ app, cand }) => {
                              const salaryNum = parseSalaryNumber(cand?.salarioActualUltimo);
                              return (
                                <div
                                  key={app.id}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 8,
                                    padding: '12px 14px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1120', lineHeight: 1.3 }}>
                                      {cand?.nombre || 'Candidato'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 500 }}>
                                      {cand?.actualUltimaPosicion || 'Posición confidencial'}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {cand?.aniosExperiencia && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 600,
                                          backgroundColor: '#F8FAFC',
                                          border: '1px solid #E2E8F0',
                                          color: '#475569',
                                          padding: '2px 6px',
                                          borderRadius: 4
                                        }}
                                      >
                                        {cand.aniosExperiencia} años exp.
                                      </span>
                                    )}

                                    {cand?.inglesAvanzado === 'Sí' && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 700,
                                          backgroundColor: '#F0FDF4',
                                          border: '1px solid #BBF7D0',
                                          color: '#15803D',
                                          padding: '2px 6px',
                                          borderRadius: 4
                                        }}
                                      >
                                        Inglés Avanzado
                                      </span>
                                    )}

                                    {cand?.maestria && hasMasterDegree(cand.maestria) && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 700,
                                          backgroundColor: '#EFF6FF',
                                          border: '1px solid #BFDBFE',
                                          color: '#1D4ED8',
                                          padding: '2px 6px',
                                          borderRadius: 4
                                        }}
                                      >
                                        Maestría
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      borderTop: '1px solid #F1F5F9',
                                      paddingTop: 8,
                                      marginTop: 2
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: salaryNum && salaryNum > 0 ? '#059669' : '#64748B'
                                      }}
                                    >
                                      {salaryNum && salaryNum > 0
                                        ? `S/ ${salaryNum.toLocaleString('es-PE')}`
                                        : 'Sueldo a convenir'}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setSelectedCandidateRow({ app, cand })}
                                      style={{
                                        backgroundColor: '#0A1120',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: 4,
                                        padding: '4px 8px',
                                        fontSize: 10,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <span>Ver Ficha</span>
                                      <ChevronRight size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: ANALYTICS & COMPENSATION */}
            {activeTab === 'analytics' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Distribución por Etapas */}
                <Card title="Distribución de Candidatos por Etapa Bigin" padding="md">
                  <div style={{ height: 260, marginTop: 10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pipelineStageCounts} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0052CC" radius={[4, 4, 0, 0]}>
                          {pipelineStageCounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Expectativa Salarial */}
                <Card title="Bandas Salariales Solicitadas (Soles)" padding="md">
                  <div style={{ height: 260, marginTop: 10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salaryBracketsData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Ficha Ejecutiva y CV del Candidato */}
      {selectedCandidateRow && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCandidateRow(null)}
          title={`Ficha Ejecutiva: ${selectedCandidateRow.cand?.nombre || 'Candidato'}`}
          subtitle={`Proceso: ${currentVacancy?.title || ''} (${currentVacancy?.code || ''})`}
          maxWidth="680px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Cabecera del Candidato */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '16px 18px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>DNI / Identificador:</span>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#0A1120', fontSize: 13 }}>
                  {selectedCandidateRow.app.candidateDni}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Etapa Actual en Bigin:</span>
                <div>
                  <span
                    style={{
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {selectedCandidateRow.app.biginStage || 'Preseleccionados'}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Expectativa Salarial:</span>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#059669', fontSize: 13 }}>
                  {typeof selectedCandidateRow.cand?.salarioActualUltimo === 'number'
                    ? `S/ ${selectedCandidateRow.cand.salarioActualUltimo.toLocaleString('es-PE')}`
                    : String(selectedCandidateRow.cand?.salarioActualUltimo || 'A convenir')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Años de Experiencia:</span>
                <div style={{ fontWeight: 700, color: '#0A1120', fontSize: 13 }}>
                  {selectedCandidateRow.cand?.aniosExperiencia || '-'} años
                </div>
              </div>
            </div>

            {/* Detalles de Perfil */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Posición & Empresa
                </span>
                <div style={{ fontWeight: 700, color: '#0A1120', fontSize: 13, marginTop: 4 }}>
                  {selectedCandidateRow.cand?.actualUltimaPosicion || '-'}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Empresa: {selectedCandidateRow.cand?.tipoEmpresa || 'Sector Privado'}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Sector: {selectedCandidateRow.cand?.sectorRubro || '-'}
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Educación & Idiomas
                </span>
                <div style={{ fontWeight: 600, color: '#0A1120', fontSize: 12, marginTop: 4 }}>
                  Inglés Avanzado: <strong>{selectedCandidateRow.cand?.inglesAvanzado || 'No'}</strong>
                </div>
                <div style={{ fontWeight: 600, color: '#0A1120', fontSize: 12, marginTop: 4 }}>
                  Maestría / MBA: <strong>{selectedCandidateRow.cand?.maestria || 'No indica'}</strong>
                </div>
              </div>
            </div>

            {/* Respuestas a Preguntas Personalizadas del Puesto */}
            {currentVacancy?.customQuestions && currentVacancy.customQuestions.length > 0 && (
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                <span style={{ fontSize: 11, color: '#0052CC', fontWeight: 700, textTransform: 'uppercase' }}>
                  Preguntas Específicas del Puesto
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {currentVacancy.customQuestions.map((q) => {
                    const ans = selectedCandidateRow.app.customAnswers?.[q.id];
                    return (
                      <div key={q.id} style={{ fontSize: 12 }}>
                        <div style={{ color: '#475569', fontWeight: 600 }}>{q.label}:</div>
                        <div style={{ color: '#0A1120', fontWeight: 700, marginTop: 2 }}>
                          {ans ? String(ans) : 'Sin respuesta'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Enlace al CV Oficial */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Curriculum Vitae resguardado en Google Drive Corporativo
              </div>
              {selectedCandidateRow.cand?.linkCv || selectedCandidateRow.app.linkCv ? (
                <a
                  href={safeExternalUrl(selectedCandidateRow.cand?.linkCv || selectedCandidateRow.app.linkCv)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#0052CC',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <FileText size={14} />
                  <span>Ver Curriculum Vitae ↗</span>
                </a>
              ) : (
                <span style={{ color: '#94A3B8', fontSize: 12, fontWeight: 500 }}>
                  CV no adjuntado
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
