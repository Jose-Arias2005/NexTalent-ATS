import React, { useState, useEffect } from 'react';
import { Logo } from '../components/ui/Logo';

interface PublicLayoutProps {
  children: React.ReactNode;
  activeNav: string;
  onNavigate: (view: string, vacancyId?: string) => void;
  onOpenSpontaneous: () => void;
  onOpenAdminLogin?: () => void;
  activeVacanciesCount: number;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  activeNav,
  onNavigate,
  onOpenSpontaneous,
  onOpenAdminLogin,
  activeVacanciesCount
}) => {
  const [activeSection, setActiveSection] = useState<string>('inicio');

  // Track active section on scroll when in landing view
  useEffect(() => {
    if (activeNav !== 'landing') return;

    const sections = ['inicio', 'posiciones-abiertas', 'metodologia', 'contacto'];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      for (const sectionId of [...sections].reverse()) {
        const el = document.getElementById(sectionId);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sectionId);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeNav]);

  const scrollToSection = (sectionId: string) => {
    if (activeNav !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          setActiveSection(sectionId);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 120);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        setActiveSection(sectionId);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
      {/* 1. TOPBAR TÉCNICA MINIMALISTA */}
      <div
        style={{
          backgroundColor: '#0A1120',
          color: '#94A3B8',
          height: 34,
          borderBottom: '1px solid #1E293B',
          fontSize: '11px',
          fontFamily: 'var(--ats-font-mono)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <div
          className="ats-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%'
          }}
        >
          {/* Left: Mandates Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#38BDF8', fontWeight: 600 }}>
              <span>CONVOCATORIAS ACTIVAS</span>
            </span>
            <span style={{ color: '#334155' }}>//</span>
            <span style={{ color: '#CBD5E1' }}>EXECUTIVE SEARCH &amp; SELECCIÓN DE TALENTO</span>
          </div>

          {/* Right: Regional Presence (Clean, no admin button) */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#94A3B8' }}>LIMA, PERÚ · ALCANCE EN LATINOAMÉRICA</span>
          </div>
        </div>
      </div>

      {/* 2. HEADER PRINCIPAL ARQUITECTÓNICO (SWISS GRID) */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div
          className="ats-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 72
          }}
        >
          {/* Brand Logo & Divider */}
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <div
              onClick={() => onNavigate('landing')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', paddingRight: 24 }}
            >
              <Logo size="md" variant="dark" />
            </div>

            {/* Thin vertical separator */}
            <div style={{ width: 1, height: 36, backgroundColor: '#E2E8F0' }} />

            {/* Navigation Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 28, paddingLeft: 24 }}>
              {/* Inicio */}
              <button
                onClick={() => scrollToSection('inicio')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeNav === 'landing' && activeSection === 'inicio' ? '#0052CC' : '#0A1120',
                  fontWeight: activeNav === 'landing' && activeSection === 'inicio' ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '24px 0',
                  transition: 'color 0.15s ease'
                }}
              >
                Inicio
                {activeNav === 'landing' && activeSection === 'inicio' && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: '#0052CC'
                    }}
                  />
                )}
              </button>

              {/* Posiciones Abiertas */}
              <button
                onClick={() => scrollToSection('posiciones-abiertas')}
                style={{
                  background: 'none',
                  border: 'none',
                  color:
                    (activeNav === 'landing' && activeSection === 'posiciones-abiertas') ||
                    activeNav === 'public-vacancies'
                      ? '#0052CC'
                      : '#0A1120',
                  fontWeight:
                    (activeNav === 'landing' && activeSection === 'posiciones-abiertas') ||
                    activeNav === 'public-vacancies'
                      ? 700
                      : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  position: 'relative',
                  padding: '24px 0',
                  transition: 'color 0.15s ease'
                }}
              >
                <span>Posiciones Abiertas</span>
                {activeVacanciesCount > 0 && (
                  <span
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: '#0052CC',
                      border: '1px solid #BFDBFE',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--ats-font-mono)',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 2
                    }}
                  >
                    {activeVacanciesCount}
                  </span>
                )}
                {((activeNav === 'landing' && activeSection === 'posiciones-abiertas') ||
                  activeNav === 'public-vacancies') && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: '#0052CC'
                    }}
                  />
                )}
              </button>

              {/* Metodología */}
              <button
                onClick={() => scrollToSection('metodologia')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeNav === 'landing' && activeSection === 'metodologia' ? '#0052CC' : '#0A1120',
                  fontWeight: activeNav === 'landing' && activeSection === 'metodologia' ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '24px 0',
                  transition: 'color 0.15s ease'
                }}
              >
                Metodología
                {activeNav === 'landing' && activeSection === 'metodologia' && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: '#0052CC'
                    }}
                  />
                )}
              </button>

            </nav>
          </div>

          {/* Action Buttons (Strict Rectangular & Executive) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => scrollToSection('contacto')}
              style={{
                backgroundColor: 'transparent',
                color: '#0A1120',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                padding: '9px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#0A1120';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
            >
              Empresas / Contratar
            </button>

            <button
              onClick={onOpenSpontaneous}
              id="btn-spontaneous-nav"
              style={{
                backgroundColor: '#0A1120',
                color: '#FFFFFF',
                border: '1px solid #1E293B',
                borderRadius: '4px',
                padding: '9px 18px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#17243A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0A1120')}
            >
              <span>Ingresar CV a la Base</span>
              <span style={{ color: '#00A3E0', fontWeight: 700 }}>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. PAGE BODY */}
      <main style={{ flex: 1 }}>{children}</main>

      {/* 4. FOOTER ARQUITECTÓNICO (AZUL OBSIDIANA & SWISS GRID) */}
      <footer
        style={{
          backgroundColor: '#0A1120',
          color: '#E2E8F0',
          borderTop: '1px solid #1E293B',
          paddingTop: 64,
          paddingBottom: 36
        }}
      >
        <div className="ats-container">
          {/* Main Grid 4 Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 40,
              paddingBottom: 48,
              borderBottom: '1px solid #1E293B'
            }}
          >
            {/* Col 1: Brand & Firm Profile */}
            <div>
              <Logo size="md" variant="light" />
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#94A3B8',
                  marginTop: 18,
                  lineHeight: 1.6,
                  maxWidth: 300
                }}
              >
                Firma regional de Executive Search y Mapeo de Talento de Alta Dirección.
                Identificamos y aseguramos a los líderes que transforman industrias en América Latina.
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 20,
                  color: '#94A3B8',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--ats-font-mono)'
                }}
              >
                <span>BÚSQUEDA DIRECTA &amp; SELECCIÓN EJECUTIVA</span>
              </div>
            </div>

            {/* Col 2: Prácticas Especializadas */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--ats-font-mono)',
                  letterSpacing: '0.08em',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  marginBottom: 16
                }}
              >
                01 // PRÁCTICAS SECTORIALES
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: '0.85rem',
                  color: '#CBD5E1'
                }}
              >
                <li>Minería, Energía &amp; Recursos Naturales</li>
                <li>Banca, Finanzas &amp; Private Equity</li>
                <li>Consumo Masivo, Retail &amp; E-commerce</li>
                <li>Tecnología, Cloud &amp; Transformación Digital</li>
                <li>Agroindustria &amp; Exportación</li>
                <li>Industrial, Logística &amp; Supply Chain</li>
              </ul>
            </div>

            {/* Col 3: Presencia Regional Limpia */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--ats-font-mono)',
                  letterSpacing: '0.08em',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  marginBottom: 16
                }}
              >
                02 // PRESENCIA &amp; COBERTURA
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.825rem', color: '#94A3B8' }}>
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, fontFamily: 'var(--ats-font-mono)', fontSize: '0.78rem' }}>
                    LIMA, PERÚ
                  </div>
                  <p style={{ margin: '2px 0 0 0' }}>Sede principal y operaciones centrales</p>
                </div>
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, fontFamily: 'var(--ats-font-mono)', fontSize: '0.78rem' }}>
                    ALCANCE REGIONAL
                  </div>
                  <p style={{ margin: '2px 0 0 0' }}>Procesos y búsqueda ejecutiva en Perú y Latinoamérica</p>
                </div>
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, fontFamily: 'var(--ats-font-mono)', fontSize: '0.78rem' }}>
                    CONTACTO DIRECTO
                  </div>
                  <p style={{ margin: '2px 0 0 0' }}>contacto@nextalent.io</p>
                </div>
              </div>
            </div>

            {/* Col 4: Blindaje Institucional */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--ats-font-mono)',
                  letterSpacing: '0.08em',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  marginBottom: 16
                }}
              >
                03 // GOBERNANZA &amp; PRIVACIDAD
              </div>
              <p style={{ fontSize: '0.825rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Tratamiento confidencial bajo estricto secreto profesional y apego a la Ley N° 29733 de Protección
                de Datos Personales. Los expedientes directivos nunca se divulgan sin consentimiento explícito.
              </p>
              <div style={{ marginTop: 16, fontSize: '0.75rem', color: '#64748B', fontFamily: 'var(--ats-font-mono)' }}>
                CONFIDENCIALIDAD GARANTIZADA · ÉTICA PROFESIONAL
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright (No admin console link) */}
          <div
            style={{
              paddingTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#64748B',
              fontFamily: 'var(--ats-font-mono)'
            }}
          >
            <span>© {new Date().getFullYear()} NEXTALENT ATS · EXECUTIVE TALENT PLATFORM · TODOS LOS DERECHOS RESERVADOS</span>
            <span style={{ color: '#475569' }}>LIMA, PERÚ · ALCANCE REGIONAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
