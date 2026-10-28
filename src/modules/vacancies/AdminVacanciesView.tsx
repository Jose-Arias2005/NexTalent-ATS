import React, { useState } from 'react';
import { Vacancy2026, Application2026, VacancyStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { storage } from '../../lib/storage';
import { hasPermission, safeExternalUrl } from '../../lib/security';
import { Import2026ProcessModal } from './Import2026ProcessModal';
import { BiginConnectionModal } from '../../components/BiginConnectionModal';
import {
  PlusCircle,
  Eye,
  Trash2,
  MapPin,
  CheckCircle2,
  PauseCircle,
  Archive,
  Search,
  FileSpreadsheet,
  Folder,
  ExternalLink,
  Upload,
  Link,
  Copy,
  Check,
  Layers,
  Terminal
} from 'lucide-react';

interface AdminVacanciesViewProps {
  vacancies: Vacancy2026[];
  applications: Application2026[];
  onSelectVacancyDetail: (vacancyId: string) => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
}

export const AdminVacanciesView: React.FC<AdminVacanciesViewProps> = ({
  vacancies,
  applications,
  onSelectVacancyDetail,
  onOpenCreateModal,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'closed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBiginModal, setShowBiginModal] = useState(false);
  const [biginModalTab, setBiginModalTab] = useState<'config' | 'logs' | 'subpipelines'>('config');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, VacancyStatus>>({});

  const currentUser = storage.getCurrentUser();
  const canDelete = hasPermission(currentUser?.role, 'delete_vacancy');
  const canCreate = hasPermission(currentUser?.role, 'create_vacancy');
  const canImport = hasPermission(currentUser?.role, 'import_csv');

  const getEffectiveStatus = (vac: Vacancy2026): VacancyStatus => {
    return localStatuses[vac.id] || vac.status;
  };

  const getFormUrl = (vacId: string) => {
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/admin.*$/, '');
    return `${origin}${path}?job=${encodeURIComponent(vacId)}`;
  };

  const handleCopyLink = (vacId: string) => {
    const url = getFormUrl(vacId);
    navigator.clipboard.writeText(url);
    setCopiedId(vacId);
    setTimeout(() => {
      setCopiedId((curr) => (curr === vacId ? null : curr));
    }, 2000);
  };

  const handleOpenForm = (vacId: string) => {
    const url = getFormUrl(vacId);
    window.open(url, '_blank');
  };

  const activeCount = vacancies.filter((v) => getEffectiveStatus(v) === 'active').length;
  const pausedCount = vacancies.filter((v) => getEffectiveStatus(v) === 'paused').length;
  const closedCount = vacancies.filter((v) => getEffectiveStatus(v) === 'closed').length;

  const filteredVacancies = vacancies.filter((v) => {
    const status = getEffectiveStatus(v);
    const matchesTab = activeTab === 'all' || status === activeTab;
    const matchesSearch =
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.folderName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getApplicationCount = (vacId: string) => {
    return applications.filter((a) => a.vacancyId === vacId).length;
  };

  const handleStatusChange = async (vacId: string, newStatus: VacancyStatus) => {
    setLocalStatuses((prev) => ({ ...prev, [vacId]: newStatus }));
    await storage.updateVacancyStatus(vacId, newStatus);
    onRefresh();
  };

  const handleDelete = async (vac: Vacancy2026) => {
    if (window.confirm(`¿Estás seguro de eliminar el puesto "${vac.title}"?`)) {
      await storage.deleteVacancy2026(vac.id);
      onRefresh();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header Strip */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ats-navy)', margin: '0 0 4px 0' }}>
            Procesos & Vacantes (2026 en adelante)
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ats-text-secondary)' }}>
            Administra los puestos activos y sube los 20 CSVs de procesos pasados con detección automática de columnas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Integración Zoho Bigin CRM */}
          <Button
            variant="outline"
            size="md"
            icon={<Layers size={16} color="#0066CC" />}
            onClick={() => {
              setBiginModalTab('config');
              setShowBiginModal(true);
            }}
          >
            Conexión Bigin CRM
          </Button>

          {/* Registro de Logs Bigin API */}
          <Button
            variant="outline"
            size="md"
            icon={<Terminal size={15} color="#0066CC" />}
            onClick={() => {
              setBiginModalTab('logs');
              setShowBiginModal(true);
            }}
          >
            Logs Bigin
          </Button>

          {/* Requisito 3: Botón de importación rápida de los 20 CSVs */}
          {canImport && (
            <Button
              variant="cyan"
              size="md"
              icon={<FileSpreadsheet size={16} />}
              onClick={() => setShowImportModal(true)}
            >
              Importar Puesto desde CSV/Excel (Formato 2026)
            </Button>
          )}

          {canCreate && (
            <Button
              variant="primary"
              size="md"
              icon={<PlusCircle size={16} />}
              onClick={onOpenCreateModal}
            >
              Crear Nueva Vacante
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          backgroundColor: '#FFFFFF',
          padding: '12px 18px',
          borderRadius: 12,
          border: '1px solid var(--ats-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'all' ? 'var(--ats-navy)' : 'transparent',
              color: activeTab === 'all' ? '#FFF' : 'var(--ats-text-secondary)'
            }}
          >
            Todas ({vacancies.length})
          </button>

          <button
            onClick={() => setActiveTab('active')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'active' ? '#10B981' : 'transparent',
              color: activeTab === 'active' ? '#FFF' : 'var(--ats-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <CheckCircle2 size={14} />
            <span>Activas ({activeCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('paused')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'paused' ? '#F59E0B' : 'transparent',
              color: activeTab === 'paused' ? '#FFF' : 'var(--ats-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <PauseCircle size={14} />
            <span>Pausadas ({pausedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('closed')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'closed' ? '#64748B' : 'transparent',
              color: activeTab === 'closed' ? '#FFF' : 'var(--ats-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Archive size={14} />
            <span>Cerradas / Históricas 2026 ({closedCount})</span>
          </button>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search
            size={16}
            color="#94A3B8"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="ats-input"
            style={{ paddingLeft: 38, paddingBottom: 8, paddingTop: 8 }}
            placeholder="Buscar por puesto o carpeta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Vacancies Table */}
      {vacancies.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--ats-border)',
            borderRadius: 12,
            padding: '50px 20px',
            textAlign: 'center'
          }}
        >
          <Folder size={44} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--ats-navy)', margin: '0 0 6px 0' }}>
            No hay procesos registrados para 2026
          </h3>
          <p style={{ color: 'var(--ats-text-muted)', fontSize: '0.875rem', maxWidth: 440, margin: '0 auto 20px auto' }}>
            Puedes subir los 20 CSVs de los puestos de este año en un clic o crear una nueva vacante para la web.
          </p>
          <Button
            variant="cyan"
            size="md"
            icon={<Upload size={16} />}
            onClick={() => setShowImportModal(true)}
          >
            Importar Primer Puesto desde CSV
          </Button>
        </div>
      ) : (
        <div className="ats-table-container">
          <table className="ats-table">
            <thead>
              <tr>
                <th>Código / Puesto</th>
                <th>Sector</th>
                <th>Carpeta de CVs Asignada</th>
                <th>Postulantes</th>
                <th>Estado</th>
                <th>Preguntas Dinámicas</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredVacancies.map((vac) => {
                const count = getApplicationCount(vac.id);
                return (
                  <tr key={vac.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ats-blue)', fontSize: '0.78rem' }}>
                        {vac.code}
                      </div>
                      <div
                        onClick={() => onSelectVacancyDetail(vac.id)}
                        style={{
                          fontWeight: 700,
                          color: 'var(--ats-navy)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          marginTop: 2
                        }}
                      >
                        {vac.title}
                      </div>
                    </td>

                    <td>
                      <Badge variant="navy">{vac.sector}</Badge>
                    </td>

                    {/* Carpetas Drive asignadas (Job y CVs) */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.825rem', color: '#1E293B' }}>
                        <Folder size={14} color="#0066CC" />
                        <span style={{ fontWeight: 600 }}>{vac.folderName}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                        {vac.jobFolderUrl && (
                          <a
                            href={safeExternalUrl(vac.jobFolderUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.72rem',
                              color: '#4338CA',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <ExternalLink size={10} />
                            <span>Carpeta Job</span>
                          </a>
                        )}
                        {(vac.cvsFolderUrl || vac.driveFolderUrl) && (
                          <a
                            href={safeExternalUrl(vac.cvsFolderUrl || vac.driveFolderUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.72rem',
                              color: '#059669',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <ExternalLink size={10} />
                            <span>Carpeta CVs</span>
                          </a>
                        )}
                      </div>
                    </td>

                    <td>
                      <button
                        onClick={() => onSelectVacancyDetail(vac.id)}
                        style={{
                          background: count > 0 ? 'var(--ats-blue-light)' : '#F1F5F9',
                          color: count > 0 ? 'var(--ats-blue)' : 'var(--ats-text-muted)',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        {count} postulantes
                      </button>
                    </td>

                    <td>
                      {(() => {
                        const currentStatus = getEffectiveStatus(vac);
                        return (
                          <select
                            className="ats-select"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              borderRadius: 6,
                              backgroundColor:
                                currentStatus === 'active'
                                  ? '#ECFDF5'
                                  : currentStatus === 'paused'
                                  ? '#FEF3C7'
                                  : '#F1F5F9',
                              color:
                                currentStatus === 'active'
                                  ? '#065F46'
                                  : currentStatus === 'paused'
                                  ? '#92400E'
                                  : '#475569',
                              borderColor: 'transparent'
                            }}
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(vac.id, e.target.value as VacancyStatus)}
                          >
                            <option value="active">● Activo (Visible Web)</option>
                            <option value="paused">● Pausado</option>
                            <option value="closed">● Cerrado / Histórico 2026</option>
                          </select>
                        );
                      })()}
                    </td>

                    <td>
                      <Badge variant="cyan">
                        {vac.customQuestions ? vac.customQuestions.length : 0} preguntas intermedias
                      </Badge>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {/* Botón Copiar Link del Formulario */}
                        <button
                          onClick={() => handleCopyLink(vac.id)}
                          title="Copiar Link del Formulario Público"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--ats-border)',
                            backgroundColor: copiedId === vac.id ? '#ECFDF5' : '#FFFFFF',
                            color: copiedId === vac.id ? '#059669' : 'var(--ats-navy)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {copiedId === vac.id ? (
                            <>
                              <Check size={13} color="#059669" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} color="#0066CC" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>

                        {/* Botón Abrir Formulario ↗ */}
                        <button
                          onClick={() => handleOpenForm(vac.id)}
                          title="Abrir Formulario en Pestaña Nueva"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid #BFDBFE',
                            backgroundColor: '#EFF6FF',
                            color: '#0066CC',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <span>Abrir</span>
                          <ExternalLink size={12} />
                        </button>

                        <Button
                          variant="navy"
                          size="sm"
                          icon={<Eye size={13} />}
                          onClick={() => onSelectVacancyDetail(vac.id)}
                        >
                          Ver Detalle
                        </Button>

                        {canDelete && (
                          <button
                            onClick={() => handleDelete(vac)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: 6
                            }}
                            title="Eliminar vacante (SuperAdmin)"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de importación inteligente de 20 CSVs */}
      <Import2026ProcessModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={onRefresh}
      />

      {/* Modal de Conexión y Gestión de Zoho Bigin CRM */}
      <BiginConnectionModal
        isOpen={showBiginModal}
        onClose={() => setShowBiginModal(false)}
        defaultTab={biginModalTab}
      />
    </div>
  );
};
