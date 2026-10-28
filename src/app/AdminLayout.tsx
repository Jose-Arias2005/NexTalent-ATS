import React, { useState } from 'react';
import { Logo } from '../components/ui/Logo';
import {
  Briefcase,
  Users,
  BarChart3,
  Globe,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Search,
  Database,
  Lock,
  LogOut,
  FolderTree,
  AlertTriangle,
  Settings,
  Layers
} from 'lucide-react';
import { storage } from '../lib/storage';
import { AdminUser } from '../types';
import { BiginConnectionModal } from '../components/BiginConnectionModal';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeNav: string;
  onNavigate: (view: string, vacancyId?: string) => void;
  onOpenCreateVacancy?: () => void;
  currentUser: AdminUser | null;
  onLogout: () => void;
  totalHistorical8k: number;
  totalCandidates2026: number;
  activeVacanciesCount: number;
  totalVacanciesCount: number;
  onRefresh: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeNav,
  onNavigate,
  onOpenCreateVacancy,
  currentUser,
  onLogout,
  totalHistorical8k,
  totalCandidates2026,
  activeVacanciesCount,
  totalVacanciesCount,
  onRefresh
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBiginModal, setShowBiginModal] = useState(false);

  const handleFormatDatabase = async () => {
    if (window.confirm('⚠️ ATENCIÓN: Esta acción formateará completamente IndexedDB, vaciando todas las vacantes, candidatos y base histórica. ¿Deseas continuar?')) {
      await storage.formatDatabase();
      alert('La base de datos ha sido formateada y restablecida a 0 registros con SuperAdmin inicial.');
      onRefresh();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Executive Dark Sidebar */}
      <aside
        style={{
          width: 280,
          backgroundColor: '#1B2A4A',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 90
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Logo size="md" variant="light" />
          <div
            style={{
              marginTop: 12,
              padding: '6px 10px',
              backgroundColor: 'rgba(0, 163, 224, 0.12)',
              borderRadius: 6,
              border: '1px solid rgba(0, 163, 224, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#00A3E0', fontWeight: 600 }}>
              <ShieldCheck size={14} />
              <span>SISTEMA ATS INTERNO</span>
            </div>
            <span style={{ fontSize: '0.68rem', backgroundColor: '#0066CC', color: '#FFF', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
              2026+
            </span>
          </div>
        </div>

        {/* Quick Action Button: Nueva Vacante */}
        {onOpenCreateVacancy && (
          <div style={{ padding: '16px 20px 8px 20px' }}>
            <button
              onClick={onOpenCreateVacancy}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#0066CC',
                color: '#FFFFFF',
                borderRadius: 8,
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 102, 204, 0.35)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0052A3')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0066CC')}
            >
              <PlusCircle size={16} />
              <span>Crear Nueva Vacante</span>
            </button>
          </div>
        )}

        {/* Navigation Menu strictly separated in 2 databases */}
        <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {/* SECCIÓN A: BASE HISTÓRICA */}
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', fontWeight: 800, padding: '10px 12px 4px 12px' }}>
            Base Histórica (Solo Lectura)
          </div>

          <button
            onClick={() => onNavigate('admin-historical')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeNav === 'admin-historical' ? 'rgba(0, 163, 224, 0.22)' : 'transparent',
              color: activeNav === 'admin-historical' ? '#00A3E0' : '#E2E8F0',
              fontWeight: activeNav === 'admin-historical' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Database size={17} color={activeNav === 'admin-historical' ? '#00A3E0' : '#94A3B8'} />
              <span>Base Histórica</span>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: 4
              }}
            >
              {totalHistorical8k.toLocaleString()}
            </span>
          </button>

          {/* SECCIÓN B: PROCESOS Y BASE ACTUALIZADA 2026+ */}
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', fontWeight: 800, padding: '14px 12px 4px 12px' }}>
            Procesos 2026 en adelante
          </div>

          <button
            onClick={() => onNavigate('admin-vacancies')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeNav === 'admin-vacancies' ? 'rgba(0, 102, 204, 0.28)' : 'transparent',
              color: activeNav === 'admin-vacancies' ? '#00A3E0' : '#CBD5E1',
              fontWeight: activeNav === 'admin-vacancies' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Briefcase size={17} color={activeNav === 'admin-vacancies' ? '#00A3E0' : '#94A3B8'} />
              <span>Gestión de Vacantes (2026)</span>
            </div>
            <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF', padding: '2px 6px', borderRadius: 4 }}>
              {totalVacanciesCount}
            </span>
          </button>

          <button
            onClick={() => onNavigate('admin-candidates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeNav === 'admin-candidates' ? 'rgba(0, 102, 204, 0.28)' : 'transparent',
              color: activeNav === 'admin-candidates' ? '#00A3E0' : '#CBD5E1',
              fontWeight: activeNav === 'admin-candidates' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={17} color={activeNav === 'admin-candidates' ? '#00A3E0' : '#94A3B8'} />
              <span>Talentos 2026 (Unif. DNI)</span>
            </div>
            <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFF', padding: '2px 6px', borderRadius: 4 }}>
              {totalCandidates2026}
            </span>
          </button>

          <button
            onClick={() => onNavigate('admin-analytics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeNav === 'admin-analytics' ? 'rgba(0, 102, 204, 0.28)' : 'transparent',
              color: activeNav === 'admin-analytics' ? '#00A3E0' : '#CBD5E1',
              fontWeight: activeNav === 'admin-analytics' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BarChart3 size={17} color={activeNav === 'admin-analytics' ? '#00A3E0' : '#94A3B8'} />
              <span>Analítica & Compensación</span>
            </div>
          </button>

          {/* SECCIÓN C: GESTIÓN & SEGURIDAD */}
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', fontWeight: 800, padding: '14px 12px 4px 12px' }}>
            Control & Seguridad
          </div>

          <button
            onClick={() => onNavigate('admin-team')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeNav === 'admin-team' ? 'rgba(0, 102, 204, 0.28)' : 'transparent',
              color: activeNav === 'admin-team' ? '#00A3E0' : '#CBD5E1',
              fontWeight: activeNav === 'admin-team' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Lock size={17} color={activeNav === 'admin-team' ? '#00A3E0' : '#94A3B8'} />
            <span>Equipo Autorizado</span>
          </button>

          <button
            onClick={() => setShowBiginModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              color: '#CBD5E1',
              fontWeight: 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Layers size={17} color="#00A3E0" />
            <span>Conexión Zoho Bigin</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          {/* Botón de Seguridad: Formatear / Limpiar Base de Datos */}
          <button
            onClick={handleFormatDatabase}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 6,
              color: '#FCA5A5',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <AlertTriangle size={13} color="#EF4444" />
            <span>Formatear / Limpiar Base de Datos</span>
          </button>

          {/* Switch to Public Site */}
          <button
            onClick={() => onNavigate('landing')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 6,
              color: '#CBD5E1',
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            <Globe size={14} color="#00A3E0" />
            <span>Ver Portal Público</span>
          </button>

          {/* Current User and Logout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 8,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#0066CC',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem'
                }}
              >
                {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'CH'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 110 }}>
                  {currentUser?.name || 'SuperAdmin'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#00A3E0' }}>{currentUser?.role || 'Admin'}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Admin Topbar */}
        <header
          style={{
            height: 64,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--ats-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 80
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--ats-text-muted)' }}>Panel ATS Interno</span>
            <span style={{ color: 'var(--ats-border-strong)' }}>/</span>
            <span style={{ fontWeight: 700, color: 'var(--ats-navy)' }}>
              {activeNav === 'admin-historical' && 'Base Histórica (Solo Lectura)'}
              {activeNav === 'admin-vacancies' && 'Gestión de Procesos & Vacantes 2026'}
              {activeNav === 'admin-candidates' && 'Base de Talentos Actualizada 2026+'}
              {activeNav === 'admin-analytics' && 'Dashboard de Analítica & Compensación'}
              {activeNav === 'admin-team' && 'Equipo Autorizado & Seguridad ATS'}
              {activeNav === 'admin-vacancy-detail' && 'Detalle del Puesto & Postulantes'}
            </span>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--ats-text-muted)' }}>Base Histórica:</span>
              <strong style={{ color: 'var(--ats-navy)' }}>{totalHistorical8k.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--ats-text-muted)' }}>Puestos 2026:</span>
              <strong style={{ color: '#0066CC' }}>{totalVacanciesCount}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--ats-text-muted)' }}>Talentos 2026:</span>
              <strong style={{ color: '#10B981' }}>{totalCandidates2026}</strong>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main style={{ flex: 1, padding: '32px' }}>{children}</main>
      </div>

      {/* Modal de Conexión y Gestión de Zoho Bigin CRM */}
      <BiginConnectionModal
        isOpen={showBiginModal}
        onClose={() => setShowBiginModal(false)}
      />
    </div>
  );
};
