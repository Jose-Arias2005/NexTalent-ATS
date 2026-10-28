import React, { useState, useMemo } from 'react';
import { Candidate2026, Vacancy2026, Application2026 } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Search,
  Filter,
  FileSpreadsheet,
  ExternalLink,
  MessageSquare,
  Users,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { hasMasterDegree, parseSalaryNumber } from '../../lib/analyticsUtils';
import { CandidateCvModal } from './CandidateCvModal';
import { Eye } from 'lucide-react';
import { storage } from '../../lib/storage';
import { safeExternalUrl, sanitizeRowForSpreadsheet } from '../../lib/security';
import { isGoogleDriveLink } from '../../lib/driveUpload';

interface AdminCandidatesViewProps {
  candidates: Candidate2026[];
  vacancies: Vacancy2026[];
  applications: Application2026[];
  onRefresh?: () => void;
}

export const AdminCandidatesView: React.FC<AdminCandidatesViewProps> = ({
  candidates,
  vacancies,
  applications,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterEnglish, setFilterEnglish] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [minSalary, setMinSalary] = useState<number | ''>('');
  const [maxSalary, setMaxSalary] = useState<number | ''>('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate2026 | null>(null);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        !searchTerm.trim() ||
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.dni.includes(searchTerm) ||
        c.actualUltimaPosicion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSector = filterSector === 'all' || c.sectorRubro === filterSector;
      const isEnglishYes = ['Sí', 'Si', 'SI', 'Yes', 'Avanzado', 'Nativo'].includes(c.inglesAvanzado);
      const matchesEnglish =
        filterEnglish === 'all' ||
        (filterEnglish === 'Sí' ? isEnglishYes : !isEnglishYes);
      const matchesCompany = filterCompany === 'all' || c.tipoEmpresa === filterCompany;

      const sal = parseSalaryNumber(c.salarioActualUltimo);
      const matchesMinSal = minSalary === '' || sal >= minSalary;
      const matchesMaxSal = maxSalary === '' || sal <= maxSalary;

      return matchesSearch && matchesSector && matchesEnglish && matchesCompany && matchesMinSal && matchesMaxSal;
    });
  }, [candidates, searchTerm, filterSector, filterEnglish, filterCompany, minSalary, maxSalary]);

  const getCandidateApplications = (dni: string) => {
    return applications.filter((a) => a.candidateDni.trim() === dni.trim());
  };

  const handleExportToExcel = async () => {
    const data = filteredCandidates.map((c) => {
      const apps = getCandidateApplications(c.dni);
      const jobsApplied = apps
        .map((a) => {
          const v = vacancies.find((vac) => vac.id === a.vacancyId);
          return v ? v.title : a.vacancyId === 'SPONTANEOUS' ? 'Postulación Espontánea' : 'N/A';
        })
        .join('; ');

      const row = {
        Fecha: c.fecha,
        Nombre: c.nombre,
        DNI: c.dni,
        Teléfono: c.telefono,
        Edad: c.edad,
        'Actual o última posición': c.actualUltimaPosicion,
        'Sector / Rubro': c.sectorRubro,
        'Años de experiencia': c.aniosExperiencia,
        'Salario actual o último salario': c.salarioActualUltimo,
        'Inglés avanzado': c.inglesAvanzado,
        Maestría: c.maestria,
        'Tipo de empresa': c.tipoEmpresa,
        'Puestos Aplicados': jobsApplied || 'Base General',
        'Link del CV': c.linkCv
      };

      // Blindaje de seguridad Layer 2: Sanitización anti-fórmulas en cada celda
      return sanitizeRowForSpreadsheet(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Talentos 2026');
    XLSX.writeFile(workbook, `ATS_Talentos_2026_${new Date().toISOString().slice(0, 10)}.xlsx`);

    // Blindaje de seguridad Layer 8: Registro de auditoría
    await storage.logAudit(
      'EXPORT_EXCEL_CANDIDATES',
      `Exportación segura a Excel de ${data.length} candidatos de la Base de Talentos 2026+.`
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ats-navy)', margin: 0 }}>
              Base de Talentos Actualizada (2026+)
            </h1>
            <Badge variant="blue">Unificada por DNI · 12 Columnas Base</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ats-text-secondary)' }}>
            Repositorio unificado de ejecutivos postulantes a los procesos 2026 y formularios web en vivo.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<FileSpreadsheet size={16} />}
          onClick={handleExportToExcel}
          disabled={filteredCandidates.length === 0}
        >
          Exportar Selección ({filteredCandidates.length}) a Excel
        </Button>
      </div>

      {/* Filters */}
      <Card padding="md" style={{ backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="#0066CC" />
            <strong style={{ fontSize: '0.9rem', color: 'var(--ats-navy)' }}>Filtros Cruzados</strong>
            <Badge variant="cyan">{filteredCandidates.length} Resultados</Badge>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterSector('all');
              setFilterEnglish('all');
              setFilterCompany('all');
              setMinSalary('');
              setMaxSalary('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ats-text-muted)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={12} />
            <span>Limpiar Filtros</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="ats-input"
              style={{ paddingLeft: 34, fontSize: '0.85rem' }}
              placeholder="Buscar por DNI, Nombre o Cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="ats-select"
              style={{ fontSize: '0.85rem' }}
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
            >
              <option value="all">Todos los Sectores</option>
              <option value="Minería y Metales">Minería y Metales</option>
              <option value="Banca y Finanzas">Banca y Finanzas</option>
              <option value="Consumo Masivo">Consumo Masivo</option>
              <option value="Retail & E-commerce">Retail & E-commerce</option>
              <option value="Tecnología & Software">Tecnología & Software</option>
              <option value="Agroindustria">Agroindustria</option>
            </select>
          </div>

          <div>
            <select
              className="ats-select"
              style={{ fontSize: '0.85rem' }}
              value={filterEnglish}
              onChange={(e) => setFilterEnglish(e.target.value)}
            >
              <option value="all">¿Inglés Avanzado? (Todos)</option>
              <option value="Sí">Sí (Inglés Avanzado)</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <select
              className="ats-select"
              style={{ fontSize: '0.85rem' }}
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            >
              <option value="all">Tipo de Empresa (Todas)</option>
              <option value="Multinacional">Multinacional</option>
              <option value="Nacional Grande">Nacional Grande</option>
              <option value="Mediana / Familiar">Mediana / Familiar</option>
              <option value="Startup">Startup</option>
            </select>
          </div>

          <div>
            <input
              type="number"
              className="ats-input"
              style={{ fontSize: '0.85rem' }}
              placeholder="Sueldo Mín (S/.)"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          <div>
            <input
              type="number"
              className="ats-input"
              style={{ fontSize: '0.85rem' }}
              placeholder="Sueldo Máx (S/.)"
              value={maxSalary}
              onChange={(e) => setMaxSalary(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
        </div>
      </Card>

      {/* Candidates Table with 12 Base Columns */}
      {candidates.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <Users size={44} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--ats-navy)', margin: '0 0 6px 0' }}>
            Base de Talentos 2026 limpia
          </h3>
          <p style={{ color: 'var(--ats-text-muted)', fontSize: '0.875rem' }}>
            Los candidatos se registrarán automáticamente cuando postulen en la web o se carguen los CSVs de puestos.
          </p>
        </Card>
      ) : (
        <div className="ats-table-container">
          <table className="ats-table" style={{ fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Teléfono / WhatsApp</th>
                <th>Edad</th>
                <th>Posición Actual / Última</th>
                <th>Sector</th>
                <th>Exp.</th>
                <th>Salario Actual</th>
                <th>Inglés</th>
                <th>Maestría</th>
                <th>Tipo Empresa</th>
                <th>Postulaciones Registradas</th>
                <th>Ficha Completa</th>
                <th>Link del CV</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((c) => {
                const apps = getCandidateApplications(c.dni);
                const cleanPhone = c.telefono.replace(/[^0-9]/g, '');

                return (
                  <tr key={c.dni}>
                    <td style={{ color: 'var(--ats-text-muted)' }}>{c.fecha}</td>
                    <td
                      onClick={() => setSelectedCandidate(c)}
                      style={{
                        fontWeight: 700,
                        color: 'var(--ats-navy)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textUnderlineOffset: 3
                      }}
                      title="Click para ver ficha completa y postulaciones"
                    >
                      {c.nombre}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--ats-blue)' }}>{c.dni}</td>
                    <td>
                      {c.telefono ? (
                        <a
                          href={safeExternalUrl(`https://wa.me/${cleanPhone}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 600 }}
                        >
                          <MessageSquare size={13} />
                          <span>{c.telefono}</span>
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{c.edad || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{c.actualUltimaPosicion}</td>
                    <td><Badge variant="navy">{c.sectorRubro}</Badge></td>
                    <td>{c.aniosExperiencia} años</td>
                    <td style={{ fontWeight: 700, color: 'var(--ats-blue)' }}>
                      {typeof c.salarioActualUltimo === 'number'
                        ? `S/. ${c.salarioActualUltimo.toLocaleString('es-PE')}`
                        : String(c.salarioActualUltimo || '-')}
                    </td>
                    <td><Badge variant="cyan">{c.inglesAvanzado}</Badge></td>
                    <td>
                      {hasMasterDegree(c.maestria) ? (
                        <span style={{ color: '#065F46', fontWeight: 600 }}>✓ {c.maestria}</span>
                      ) : (
                        <span style={{ color: 'var(--ats-text-muted)' }}>{c.maestria || 'No menciona'}</span>
                      )}
                    </td>
                    <td>{c.tipoEmpresa}</td>
                    <td>
                      {apps.length === 0 ? (
                        <span style={{ color: 'var(--ats-text-muted)' }}>Base General</span>
                      ) : (
                        <span style={{ fontWeight: 700, color: 'var(--ats-navy)' }}>
                          {apps.length} {apps.length === 1 ? 'puesto' : 'puestos'}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedCandidate(c)}
                        className="ats-btn ats-btn-sm"
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: 'var(--ats-navy)',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: '1px solid var(--ats-border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Eye size={12} color="#0066CC" />
                        <span>Ver Ficha</span>
                      </button>
                    </td>
                    <td>
                      {c.linkCv && c.linkCv.startsWith('http') ? (
                        <a
                          href={safeExternalUrl(c.linkCv)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ats-btn ats-btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            backgroundColor: isGoogleDriveLink(c.linkCv) ? '#0284C7' : 'var(--ats-blue)',
                            color: '#FFF',
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={isGoogleDriveLink(c.linkCv) ? 'Abrir archivo en Google Drive Corporativo' : 'Abrir enlace de CV'}
                        >
                          <ExternalLink size={12} />
                          <span>{isGoogleDriveLink(c.linkCv) ? 'Drive CV' : 'Abrir CV'}</span>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--ats-text-muted)' }}>{c.linkCv || 'Sin link'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ficha Completa del Candidato con cambio de estado */}
      <CandidateCvModal
        candidate={selectedCandidate}
        isOpen={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        applications={selectedCandidate ? getCandidateApplications(selectedCandidate.dni) : []}
        vacancies={vacancies}
        onRefresh={onRefresh}
      />
    </div>
  );
};
