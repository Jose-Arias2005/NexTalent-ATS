import React, { useState } from 'react';
import { Vacancy2026 } from '../../types';
import {
  Search,
  MapPin,
  Briefcase,
  ArrowLeft,
  Copy,
  Check,
  ArrowRight,
  Filter,
  Send
} from 'lucide-react';

interface PublicVacanciesViewProps {
  vacancies: Vacancy2026[];
  onSelectVacancy: (vacancy: Vacancy2026) => void;
  onOpenSpontaneous: () => void;
  onBackToHome: () => void;
}

export const PublicVacanciesView: React.FC<PublicVacanciesViewProps> = ({
  vacancies,
  onSelectVacancy,
  onOpenSpontaneous,
  onBackToHome
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeVacancies = vacancies.filter((v) => v.status === 'active');

  const filtered = activeVacancies.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSector = selectedSector === 'all' || v.sector === selectedSector;
    const matchesModality = selectedModality === 'all' || v.modality === selectedModality;

    return matchesSearch && matchesSector && matchesModality;
  });

  const handleCopyLink = (e: React.MouseEvent, vacancyId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?job=${vacancyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(vacancyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sectors = [
    'all',
    'Minería y Metales',
    'Banca y Finanzas',
    'Consumo Masivo',
    'Tecnología & Software',
    'Agroindustria',
    'Energía & Oil/Gas'
  ];

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '80vh', padding: '40px 0 88px 0' }}>
      <div className="ats-container">
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <button
            onClick={onBackToHome}
            style={{
              background: 'none',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#0052CC',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <ArrowLeft size={14} />
            <span>Volver a Inicio</span>
          </button>
          <span style={{ color: '#CBD5E1', fontSize: '0.8rem' }}>/</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--ats-font-mono)',
              color: '#64748B',
              textTransform: 'uppercase'
            }}
          >
            PORTAL DE MANDATOS EJECUTIVOS 2026
          </span>
        </div>

        {/* Page Header Arquitectónico */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            paddingBottom: 28,
            borderBottom: '1px solid #E2E8F0',
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
              EXECUTIVE TALENT LEDGER // BÚSQUEDAS EN CURSO
            </div>
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#0A1120',
                margin: '0 0 8px 0',
                letterSpacing: '-0.03em'
              }}
            >
              Posiciones Abiertas de Alta Dirección
            </h1>
            <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0, maxWidth: 680 }}>
              Mandatos vigentes gestionados de manera exclusiva y confidencial en Perú, Chile y la región.
            </p>
          </div>

          <button
            onClick={onOpenSpontaneous}
            style={{
              backgroundColor: '#0A1120',
              color: '#FFFFFF',
              border: '1px solid #1E293B',
              borderRadius: '4px',
              padding: '10px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#17243A')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0A1120')}
          >
            <Send size={14} color="#38BDF8" />
            <span>Postulación Espontánea (Base General)</span>
          </button>
        </div>

        {/* Barra de Filtros & Búsqueda Estilo Ledger */}
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
            marginBottom: 24
          }}
        >
          {/* Input de Búsqueda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 320px' }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              className="ats-input"
              style={{ border: 'none', padding: '6px 0', fontSize: '0.9rem', boxShadow: 'none' }}
              placeholder="Buscar por cargo, palabra clave o código de vacante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Selectores */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={14} color="#64748B" />
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                style={{
                  padding: '7px 12px',
                  border: '1px solid #CBD5E1',
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
                <option value="Tecnología & Software">Tecnología & Software</option>
                <option value="Agroindustria">Agroindustria</option>
                <option value="Energía & Oil/Gas">Energía & Oil/Gas</option>
              </select>
            </div>

            <select
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              style={{
                padding: '7px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#0A1120',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <option value="all">Todas las Modalidades</option>
              <option value="Presencial">Presencial</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Remoto">Remoto</option>
            </select>

            <span
              style={{
                fontFamily: 'var(--ats-font-mono)',
                fontSize: '0.75rem',
                color: '#0052CC',
                backgroundColor: '#EFF6FF',
                padding: '6px 12px',
                borderRadius: '3px',
                border: '1px solid #BFDBFE'
              }}
            >
              {filtered.length} MANDATOS ENCONTRADOS
            </span>
          </div>
        </div>

        {/* Ledger Table Container */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '4px',
            overflow: 'hidden',
            boxShadow: 'var(--ats-shadow-xs)'
          }}
        >
          {/* Header de Columnas Ledger */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '130px 1.5fr 1.2fr 130px 130px 220px',
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
            <div>FECHA</div>
            <div style={{ textAlign: 'right' }}>ACCIONES</div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: '#64748B' }}>
              <Briefcase size={40} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ color: '#0A1120', fontSize: '1.15rem', marginBottom: 6 }}>
                No se encontraron vacantes con los criterios indicados
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: 20 }}>
                Modifica los filtros o déjanos tus datos en la base general para futuras oportunidades.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSector('all');
                  setSelectedModality('all');
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0A1120',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            filtered.map((vacancy) => {
              const isCopied = copiedId === vacancy.id;
              const formattedDate = vacancy.createdAt
                ? new Date(vacancy.createdAt).toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: 'short'
                  })
                : '2026';

              return (
                <div
                  key={vacancy.id}
                  onClick={() => onSelectVacancy(vacancy)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 1.5fr 1.2fr 130px 130px 220px',
                    alignItems: 'center',
                    padding: '20px 24px',
                    borderBottom: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  {/* Código Monospace */}
                  <div
                    style={{
                      fontFamily: 'var(--ats-font-mono)',
                      fontSize: '0.8rem',
                      color: '#0052CC',
                      fontWeight: 600
                    }}
                  >
                    {vacancy.code}
                  </div>

                  {/* Título & Ubicación */}
                  <div>
                    <div style={{ fontWeight: 700, color: '#0A1120', fontSize: '0.98rem' }}>
                      {vacancy.title}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.78rem',
                        color: '#64748B',
                        marginTop: 2
                      }}
                    >
                      <MapPin size={12} color="#94A3B8" />
                      <span>{vacancy.location}</span>
                    </div>
                  </div>

                  {/* Sector */}
                  <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                    {vacancy.sector}
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
                      {vacancy.modality}
                    </span>
                  </div>

                  {/* Fecha */}
                  <div style={{ fontSize: '0.78rem', fontFamily: 'var(--ats-font-mono)', color: '#64748B' }}>
                    {formattedDate}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      onClick={(e) => handleCopyLink(e, vacancy.id)}
                      title="Copiar link directo a la postulación"
                      style={{
                        backgroundColor: isCopied ? '#ECFDF5' : '#FFFFFF',
                        color: isCopied ? '#059669' : '#475569',
                        border: '1px solid #E2E8F0',
                        borderRadius: '4px',
                        padding: '7px 12px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {isCopied ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                      <span>{isCopied ? 'Copiado' : 'Link'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVacancy(vacancy);
                      }}
                      style={{
                        backgroundColor: '#0A1120',
                        color: '#FFFFFF',
                        border: '1px solid #1E293B',
                        borderRadius: '4px',
                        padding: '7px 16px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#17243A')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0A1120')}
                    >
                      <span>Aplicar a la Posición</span>
                      <span style={{ color: '#38BDF8', fontWeight: 700 }}>→</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
