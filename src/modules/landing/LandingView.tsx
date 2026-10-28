import React, { useState } from 'react';
import { Vacancy2026 } from '../../types';
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  MapPin,
  Check,
  Copy
} from 'lucide-react';

interface LandingViewProps {
  vacancies: Vacancy2026[];
  onSelectVacancy: (vacancy: Vacancy2026) => void;
  onOpenSpontaneous: () => void;
  onNavigateToVacancies: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  vacancies,
  onSelectVacancy,
  onOpenSpontaneous,
  onNavigateToVacancies: _onNavigateToVacancies
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const activeVacancies = vacancies.filter((v) => v.status === 'active');

  const filteredVacancies = activeVacancies.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSector = selectedSector === 'all' || v.sector === selectedSector;

    return matchesSearch && matchesSector;
  });

  const handleCopyLink = (e: React.MouseEvent, vacancyId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?job=${vacancyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(vacancyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail) return;
    setContactSent(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactCompany('');
      setContactMessage('');
      setContactSent(false);
    }, 4000);
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF' }}>
      {/* ======================================================================
          1. HERO ASIMÉTRICO 60/40 (SWISS GRID & TARJETA EJECUTIVA CLARA)
          ====================================================================== */}
      <section
        id="inicio"
        style={{
          borderBottom: '1px solid #E2E8F0',
          position: 'relative',
          backgroundColor: '#FFFFFF'
        }}
      >
        <div className="ats-container" style={{ padding: 0 }}>
          <div
            className="ats-grid-bg"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              borderLeft: '1px solid #E2E8F0',
              borderRight: '1px solid #E2E8F0'
            }}
          >
            {/* Desktop 60 / 40 Split */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
                minHeight: 560
              }}
            >
              {/* --- COLUMNA IZQUIERDA (60%): AUTORIDAD CORPORATIVA --- */}
              <div
                style={{
                  padding: '56px 48px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRight: '1px solid #E2E8F0',
                  backgroundColor: 'rgba(255, 255, 255, 0.94)'
                }}
              >
                <div>
                  {/* Etiqueta Superior Sobria */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 28,
                      fontFamily: 'var(--ats-font-mono)',
                      fontSize: '0.75rem',
                      letterSpacing: '0.08em',
                      color: '#0052CC',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  >
                    <span>FIRMA DE BÚSQUEDA EJECUTIVA &amp; SELECCIÓN DE TALENTO</span>
                    <span style={{ flex: 1, height: 1, backgroundColor: '#CBD5E1', maxWidth: 80 }} />
                  </div>

                  {/* Título Principal Editorial de Alta Dirección */}
                  <h1
                    style={{
                      fontSize: 'clamp(2.3rem, 3.8vw, 3.5rem)',
                      fontWeight: 800,
                      color: '#0A1120',
                      lineHeight: 1.12,
                      letterSpacing: '-0.03em',
                      margin: '0 0 24px 0'
                    }}
                  >
                    Identificamos y aseguramos a los líderes que transforman industrias en{' '}
                    <span
                      style={{
                        fontFamily: 'var(--ats-font-serif)',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        color: '#0052CC'
                      }}
                    >
                      América Latina.
                    </span>
                  </h1>

                  {/* Subtítulo Ejecutivo */}
                  <p
                    style={{
                      fontSize: '1.02rem',
                      color: '#475569',
                      lineHeight: 1.65,
                      margin: '0 0 36px 0',
                      maxWidth: 600
                    }}
                  >
                    Acompañamos a organizaciones líderes en la atracción y selección de ejecutivos clave,
                    combinando búsqueda directa especializada, rigor consultivo y conocimiento profundo del mercado regional.
                  </p>

                  {/* Botones de Acción Rectangulares */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    <button
                      onClick={() => {
                        const el = document.getElementById('posiciones-abiertas');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{
                        backgroundColor: '#0A1120',
                        color: '#FFFFFF',
                        border: '1px solid #1E293B',
                        borderRadius: '4px',
                        padding: '12px 24px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#17243A')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0A1120')}
                    >
                      <span>Ver Posiciones Abiertas</span>
                      <ArrowRight size={15} color="#38BDF8" />
                    </button>

                    <button
                      onClick={onOpenSpontaneous}
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#0A1120',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        padding: '12px 22px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#0A1120';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                      }}
                    >
                      <span>Presentar CV Espontáneo</span>
                      <ArrowUpRight size={14} color="#64748B" />
                    </button>
                  </div>
                </div>

                {/* 3 Pilares Reales Swiss Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    borderTop: '1px solid #E2E8F0',
                    marginTop: 48,
                    paddingTop: 24,
                    gap: 16
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#0A1120',
                        lineHeight: 1.25
                      }}
                    >
                      Búsqueda Directa
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                      Headhunting confidencial
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 16 }}>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#0052CC',
                        lineHeight: 1.25
                      }}
                    >
                      Mandos Medios &amp; Alta Dirección
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                      Jefaturas, Gerencias y C-Level
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 16 }}>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#0A1120',
                        lineHeight: 1.25
                      }}
                    >
                      Alcance Regional
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                      Procesos en Perú y Latinoamérica
                    </div>
                  </div>
                </div>
              </div>

              {/* --- COLUMNA DERECHA (40%): TARJETA EJECUTIVA CLARA (CONVOCATORIAS RECIENTES) --- */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 2px 12px rgba(10, 17, 32, 0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Header de la Tarjeta */}
                  <div
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, backgroundColor: '#0052CC', borderRadius: '50%' }} />
                      <span
                        style={{
                          fontFamily: 'var(--ats-font-mono)',
                          fontSize: '0.78rem',
                          letterSpacing: '0.06em',
                          color: '#0A1120',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}
                      >
                        Convocatorias Recientes
                      </span>
                    </div>

                    {activeVacancies.length > 0 && (
                      <span
                        style={{
                          fontFamily: 'var(--ats-font-mono)',
                          fontSize: '0.7rem',
                          color: '#0052CC',
                          backgroundColor: '#EFF6FF',
                          padding: '2px 8px',
                          borderRadius: '2px',
                          border: '1px solid #BFDBFE',
                          fontWeight: 600
                        }}
                      >
                        {activeVacancies.length} ACTIVAS
                      </span>
                    )}
                  </div>

                  {/* Listado de Últimas 3 Vacantes Reales */}
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {activeVacancies.length === 0 ? (
                      <div
                        style={{
                          padding: '28px 16px',
                          textAlign: 'center',
                          color: '#64748B',
                          fontSize: '0.85rem'
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: 600, color: '#0A1120' }}>
                          Búsquedas confidenciales en proceso
                        </p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                          Actualmente nuestros mandatos se gestionan de forma reservada.
                        </p>
                      </div>
                    ) : (
                      activeVacancies.slice(0, 3).map((v) => (
                        <div
                          key={v.id}
                          onClick={() => onSelectVacancy(v)}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '4px',
                            padding: '14px 16px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                            e.currentTarget.style.borderColor = '#0052CC';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#E2E8F0';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span
                              style={{
                                fontFamily: 'var(--ats-font-mono)',
                                fontSize: '0.72rem',
                                color: '#0052CC',
                                fontWeight: 700
                              }}
                            >
                              {v.code}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#64748B',
                                backgroundColor: '#F1F5F9',
                                padding: '2px 6px',
                                borderRadius: '2px'
                              }}
                            >
                              {v.modality}
                            </span>
                          </div>

                          <div
                            style={{
                              fontWeight: 700,
                              color: '#0A1120',
                              fontSize: '0.92rem',
                              marginBottom: 6,
                              lineHeight: 1.3
                            }}
                          >
                            {v.title}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.78rem',
                              color: '#64748B'
                            }}
                          >
                            <span>{v.sector}</span>
                            <span
                              style={{
                                color: '#0052CC',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <span>Ver posición</span>
                              <span>→</span>
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bloque Limpio de Postulación Espontánea */}
                  <div
                    style={{
                      borderTop: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.825rem',
                        color: '#475569',
                        margin: 0,
                        lineHeight: 1.5
                      }}
                    >
                      ¿No encuentras tu posición actual? Forma parte de nuestra red ejecutiva para futuros procesos.
                    </p>
                    <button
                      onClick={onOpenSpontaneous}
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#0052CC',
                        border: '1px solid #BFDBFE',
                        borderRadius: '4px',
                        padding: '9px 14px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                        e.currentTarget.style.borderColor = '#0052CC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#BFDBFE';
                      }}
                    >
                      <span>Ingresar CV a la Red Ejecutiva</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          2. JOB BOARD PÚBLICO (INMEDIATAMENTE DESPUÉS DEL HERO)
          ====================================================================== */}
      <section
        id="posiciones-abiertas"
        style={{
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          padding: '80px 0'
        }}
      >
        <div className="ats-container">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 20,
              marginBottom: 32
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--ats-font-mono)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  color: '#0052CC',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: 8
                }}
              >
                02 // MANDATOS ACTIVOS
              </div>
              <h2
                style={{
                  fontSize: '2.2rem',
                  fontWeight: 800,
                  color: '#0A1120',
                  letterSpacing: '-0.02em',
                  margin: 0
                }}
              >
                Mandatos Ejecutivos Activos
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={onOpenSpontaneous}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0A1120',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  padding: '9px 18px',
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
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
              >
                Postulación Espontánea (Red General)
              </button>
            </div>
          </div>

          {/* Filtros Rápidos Estilo Ledger */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 320px' }}>
              <Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder="Buscar por cargo, código o palabras clave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.88rem',
                  color: '#0A1120'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#0A1120',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Todas las Prácticas ({activeVacancies.length})</option>
                <option value="Minería y Metales">Minería y Metales</option>
                <option value="Banca y Finanzas">Banca y Finanzas</option>
                <option value="Consumo Masivo">Consumo Masivo</option>
                <option value="Tecnología & Software">Tecnología &amp; Software</option>
                <option value="Industrial y Operaciones">Industrial y Operaciones</option>
              </select>

              <span
                style={{
                  fontFamily: 'var(--ats-font-mono)',
                  fontSize: '0.75rem',
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  padding: '6px 10px',
                  borderRadius: '3px'
                }}
              >
                {filteredVacancies.length} PROCESOS
              </span>
            </div>
          </div>

          {/* Tabla Executive Ledger */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            {/* Header de Columnas Ledger */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '130px 1.4fr 1.2fr 130px 220px',
                padding: '12px 24px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                fontFamily: 'var(--ats-font-mono)',
                fontSize: '0.72rem',
                color: '#64748B',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              <div>CÓDIGO</div>
              <div>POSICIÓN EJECUTIVA</div>
              <div>PRÁCTICA / SECTOR</div>
              <div>MODALIDAD</div>
              <div style={{ textAlign: 'right' }}>ACCIONES</div>
            </div>

            {filteredVacancies.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center', color: '#64748B' }}>
                <Briefcase size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ fontSize: '1.05rem', color: '#0A1120', margin: '0 0 6px 0' }}>
                  No se encontraron puestos con los filtros indicados
                </h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                  Puedes limpiar la búsqueda o ingresar tu currículum directamente a la red general.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedSector('all');
                  }}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              filteredVacancies.map((v) => {
                const isCopied = copiedId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => onSelectVacancy(v)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '130px 1.4fr 1.2fr 130px 220px',
                      alignItems: 'center',
                      padding: '18px 24px',
                      borderBottom: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    {/* Código Monospace */}
                    <div style={{ fontFamily: 'var(--ats-font-mono)', fontSize: '0.78rem', color: '#0052CC', fontWeight: 600 }}>
                      {v.code}
                    </div>

                    {/* Título */}
                    <div>
                      <div style={{ fontWeight: 700, color: '#0A1120', fontSize: '0.95rem' }}>
                        {v.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={12} color="#94A3B8" />
                        <span>{v.location}</span>
                      </div>
                    </div>

                    {/* Sector */}
                    <div style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 500 }}>
                      {v.sector}
                    </div>

                    {/* Modalidad */}
                    <div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'var(--ats-font-mono)',
                          padding: '2px 8px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          borderRadius: '2px',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        {v.modality}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        onClick={(e) => handleCopyLink(e, v.id)}
                        title="Copiar enlace de este puesto"
                        style={{
                          backgroundColor: isCopied ? '#ECFDF5' : '#FFFFFF',
                          color: isCopied ? '#059669' : '#475569',
                          border: '1px solid #E2E8F0',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {isCopied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                        <span>{isCopied ? 'Copiado' : 'Link'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVacancy(v);
                        }}
                        style={{
                          backgroundColor: '#0A1120',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>Aplicar</span>
                        <span style={{ color: '#38BDF8' }}>→</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ======================================================================
          3. METODOLOGÍA CONSULTIVA (AZUL CORPORATIVO PROFUNDO #1B2A4A)
          ====================================================================== */}
      <section
        id="metodologia"
        style={{
          backgroundColor: '#1B2A4A',
          color: '#FFFFFF',
          borderBottom: '1px solid #142038',
          padding: '88px 0'
        }}
      >
        <div className="ats-container">
          {/* Header de Metodología */}
          <div style={{ maxWidth: 760, marginBottom: 56 }}>
            <div
              style={{
                fontFamily: 'var(--ats-font-mono)',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                color: '#38BDF8',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 10
              }}
            >
              03 // RIGOR CONSULTIVO &amp; METODOLOGÍA
            </div>
            <h2
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                margin: '0 0 16px 0',
                lineHeight: 1.15
              }}
            >
              Metodología consultiva basada en{' '}
              <span style={{ fontFamily: 'var(--ats-font-serif)', fontStyle: 'italic', fontWeight: 400, color: '#38BDF8' }}>
                búsqueda directa.
              </span>
            </h2>
            <p style={{ color: '#CBD5E1', fontSize: '0.98rem', lineHeight: 1.65, margin: 0 }}>
              No esperamos a que el talento busque trabajo. Identificamos y contactamos de manera directa y confidencial
              a los profesionales con la trayectoria y el ajuste cultural adecuado para cada posición estratégica.
            </p>
          </div>

          {/* 4 Fases Estructuradas Swiss Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              borderTop: '1px solid #2A3F68',
              borderLeft: '1px solid #2A3F68'
            }}
          >
            {/* FASE 01 */}
            <div
              style={{
                padding: '36px 30px',
                borderRight: '1px solid #2A3F68',
                borderBottom: '1px solid #2A3F68',
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--ats-font-mono)',
                  fontSize: '0.75rem',
                  color: '#38BDF8',
                  fontWeight: 700,
                  marginBottom: 16
                }}
              >
                FASE 01 // DEFINICIÓN
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px 0' }}>
                Levantamiento del Perfil y Mercado
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Entendimiento profundo de la cultura de la empresa cliente, responsabilidades del rol y mapeo de organizaciones objetivo.
              </p>
            </div>

            {/* FASE 02 */}
            <div
              style={{
                padding: '36px 30px',
                borderRight: '1px solid #2A3F68',
                borderBottom: '1px solid #2A3F68',
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--ats-font-mono)',
                  fontSize: '0.75rem',
                  color: '#38BDF8',
                  fontWeight: 700,
                  marginBottom: 16
                }}
              >
                FASE 02 // IDENTIFICACIÓN
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px 0' }}>
                Búsqueda Directa e Identificación
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Contacto directo y confidencial con profesionales en activo y búsqueda en nuestra red propia de talento especializado.
              </p>
            </div>

            {/* FASE 03 */}
            <div
              style={{
                padding: '36px 30px',
                borderRight: '1px solid #2A3F68',
                borderBottom: '1px solid #2A3F68',
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--ats-font-mono)',
                  fontSize: '0.75rem',
                  color: '#38BDF8',
                  fontWeight: 700,
                  marginBottom: 16
                }}
              >
                FASE 03 // EVALUACIÓN
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px 0' }}>
                Evaluación Integral
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Entrevistas por competencias, análisis de trayectoria directiva y evaluación del ajuste cultural y liderazgo requerido para la organización.
              </p>
            </div>

            {/* FASE 04 */}
            <div
              style={{
                padding: '36px 30px',
                borderRight: '1px solid #2A3F68',
                borderBottom: '1px solid #2A3F68',
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--ats-font-mono)',
                  fontSize: '0.75rem',
                  color: '#38BDF8',
                  fontWeight: 700,
                  marginBottom: 16
                }}
              >
                FASE 04 // PRESENTACIÓN Y CIERRE
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px 0' }}>
                Presentación de Terna y Cierre
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                Presentación de informes comparativos de los finalistas, facilitación en la oferta y toma de decisiones, y acompañamiento durante la incorporación.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          4. SECCIÓN EMPRESAS & CONTACTO CORPORATIVO (BENEFICIOS REALES)
          ====================================================================== */}
      <section
        id="contacto"
        style={{
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          padding: '88px 0'
        }}
      >
        <div className="ats-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 64,
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '56px 48px',
              backgroundColor: '#FAFCFF'
            }}
          >
            {/* Columna Izquierda: Información Corporativa */}
            <div>
              <div
                style={{
                  fontFamily: 'var(--ats-font-mono)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  color: '#0052CC',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: 10
                }}
              >
                04 // PARA EMPRESAS &amp; DIRECTORIOS
              </div>
              <h3
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#0A1120',
                  letterSpacing: '-0.02em',
                  margin: '0 0 16px 0',
                  lineHeight: 1.2
                }}
              >
                Inicia un mandato de búsqueda confidencial
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, marginBottom: 28 }}>
                Si tu organización requiere incorporar un Directorio, Vicepresidencia o Gerencia General,
                nuestros Socios Directores liderarán el proceso con absoluto sigilo y rigor.
              </p>

              {/* Beneficios Reales y Honestos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.875rem', color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, backgroundColor: '#0052CC', borderRadius: '50%' }} />
                  <span>Acompañamiento directo de principio a fin del proceso.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, backgroundColor: '#0052CC', borderRadius: '50%' }} />
                  <span>Manejo 100% confidencial para reemplazos críticos o nuevas posiciones.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, backgroundColor: '#0052CC', borderRadius: '50%' }} />
                  <span>Evaluación rigurosa de experiencia técnica y ajuste cultural.</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Formulario Ejecutivo */}
            <div>
              {contactSent ? (
                <div
                  style={{
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '4px',
                    padding: 24,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ color: '#065F46', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>
                    ¡Mensaje recibido con éxito!
                  </div>
                  <p style={{ color: '#047857', fontSize: '0.85rem', margin: 0 }}>
                    Un Socio Consultor se comunicará contigo de manera confidencial en menos de 24 horas hábiles.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0A1120', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--ats-font-mono)' }}>
                      Nombre &amp; Cargo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Morales - Director de Recursos Humanos"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0A1120', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--ats-font-mono)' }}>
                        Correo Corporativo
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="cmorales@empresa.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0A1120', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--ats-font-mono)' }}>
                        Empresa / Sector
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Grupo Minero del Sur"
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0A1120', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--ats-font-mono)' }}>
                      Detalle de la búsqueda o posición requerida
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Descríbenos brevemente el nivel del puesto (C-Level, VP, Gerente) y el alcance de la búsqueda..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#0A1120',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '12px 20px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 6
                    }}
                  >
                    Solicitar Contacto con un Socio Consultor →
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
