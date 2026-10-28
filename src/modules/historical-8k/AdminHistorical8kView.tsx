import React, { useState, useMemo } from 'react';
import { HistoricalCandidate8k } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { storage } from '../../lib/storage';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Upload,
  ExternalLink,
  MessageSquare,
  BarChart3,
  Users,
  DollarSign,
  GraduationCap,
  Building2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { hasMasterDegree } from '../../lib/analyticsUtils';
import { safeExternalUrl, sanitizeForSpreadsheet, sanitizeInputText, sanitizeRowForSpreadsheet } from '../../lib/security';

interface AdminHistorical8kViewProps {
  historicalData: HistoricalCandidate8k[];
  onRefresh: () => void;
}

export const AdminHistorical8kView: React.FC<AdminHistorical8kViewProps> = ({
  historicalData,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'analytics' | 'import'>('table');

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedEnglish, setSelectedEnglish] = useState('all');
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [minSalary, setMinSalary] = useState<number | ''>('');
  const [maxSalary, setMaxSalary] = useState<number | ''>('');

  // Pagination for high performance (+8,000 records)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<{ total: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return historicalData.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ultimaPosicion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ultimaEmpresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.universidadPregrado.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesArea = selectedArea === 'all' || item.area === selectedArea;
      const matchesEnglish = selectedEnglish === 'all' || item.nivelIngles === selectedEnglish;
      const matchesUni = selectedUniversity === 'all' || item.universidadPregrado === selectedUniversity;

      const sal = item.sueldoEstimacionSoles || 0;
      const matchesMinSal = minSalary === '' || sal >= minSalary;
      const matchesMaxSal = maxSalary === '' || (sal > 0 && sal <= maxSalary);

      return matchesSearch && matchesArea && matchesEnglish && matchesUni && matchesMinSal && matchesMaxSal;
    });
  }, [historicalData, searchTerm, selectedArea, selectedEnglish, selectedUniversity, minSalary, maxSalary]);

  // Paginated slice
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Unique filters lists
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    historicalData.forEach((i) => i.area && set.add(i.area));
    return Array.from(set).sort();
  }, [historicalData]);

  const availableUniversities = useMemo(() => {
    const set = new Set<string>();
    historicalData.forEach((i) => i.universidadPregrado && set.add(i.universidadPregrado));
    return Array.from(set).slice(0, 30).sort();
  }, [historicalData]);

  // Analytics Metrics
  const salaries = useMemo(() => {
    return historicalData.map((i) => i.sueldoEstimacionSoles).filter((s): s is number => Boolean(s && s > 0));
  }, [historicalData]);

  const avgSalary = salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0;
  const minSal = salaries.length > 0 ? Math.min(...salaries) : 0;
  const maxSal = salaries.length > 0 ? Math.max(...salaries) : 0;

  const withMasterCount = useMemo(() => {
    return historicalData.filter((i) => hasMasterDegree(i.maestria)).length;
  }, [historicalData]);

  // Export to Excel 23 exact columns with Formula Injection hardening
  const handleExportToExcel = async () => {
    const exportRows = filteredData.map((item) => {
      const row = {
        Nombre: item.nombre,
        Género: item.genero,
        Edad: item.edad,
        'Número telefónico': item.numeroTelefonico,
        Correo: item.correo,
        LinkedIn: item.linkedin,
        'Carrera (pregrado)': item.carreraPregrado,
        'Universidad (pregrado)': item.universidadPregrado,
        Maestría: item.maestria,
        'Casa de estudio (Maestría)': item.casaEstudioMaestria,
        'Especializaciones/Diplomados': item.especializacionesDiplomados,
        'Casa de estudio (Especializaciones/Diplomados)': item.casaEstudioEspecializaciones,
        'Sueldo (estimación) [mensuales & soles]': item.sueldoEstimacionSoles,
        'Línea de especialización': item.lineaEspecializacion,
        Área: item.area,
        'Años de experiencia': item.aniosExperiencia,
        'Última posición': item.ultimaPosicion,
        'Fecha de última posición': item.fechaUltimaPosicion,
        'Nivel de inglés': item.nivelIngles,
        'Última empresa': item.ultimaEmpresa,
        '# de trabajadores (última empresa)': item.numTrabajadoresUltimaEmpresa,
        'Facturacion 2024 [dólares]': item.facturacion2024Dolares,
        'Link del CV': item.linkCv
      };

      // Blindaje de seguridad Layer 2: Sanitización anti-fórmulas
      return sanitizeRowForSpreadsheet(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Base Histórica');
    XLSX.writeFile(workbook, `ATS_Base_Historica_${new Date().toISOString().slice(0, 10)}.xlsx`);

    // Blindaje de seguridad Layer 8: Registro de auditoría
    await storage.logAudit(
      'EXPORT_EXCEL_8K',
      `Exportación segura a Excel de ${exportRows.length} registros de la Base Histórica.`
    );
  };

  // Download 23-column standard template
  const handleDownloadTemplate = () => {
    const sample = [
      {
        Nombre: 'Carlos Morales Benavides',
        Género: 'Masculino',
        Edad: 45,
        'Número telefónico': '+51 984 123 456',
        Correo: 'carlos.morales@ejemplo.com',
        LinkedIn: 'https://linkedin.com/in/carlosmorales',
        'Carrera (pregrado)': 'Ingeniería Industrial',
        'Universidad (pregrado)': 'Universidad de Lima',
        Maestría: 'MBA',
        'Casa de estudio (Maestría)': 'CENTRUM Católica',
        'Especializaciones/Diplomados': 'Diplomado en Supply Chain',
        'Casa de estudio (Especializaciones/Diplomados)': 'ESAN',
        'Sueldo (estimación) [mensuales & soles]': 24000,
        'Línea de especialización': 'Operaciones y Cadena de Suministro',
        Área: 'Operaciones',
        'Años de experiencia': 18,
        'Última posición': 'Gerente de Logística y Operaciones',
        'Fecha de última posición': '2023 - Presente',
        'Nivel de inglés': 'Avanzado',
        'Última empresa': 'Alicorp S.A.A.',
        '# de trabajadores (última empresa)': '1000+',
        'Facturacion 2024 [dólares]': 'USD $800M+',
        'Link del CV': 'https://drive.google.com/file/d/sample/view'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla 23 Cols');
    XLSX.writeFile(workbook, 'Plantilla_Base_Historica_23_Columnas.xlsx');
  };

  // Import handler with 23 column detection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportStats(null);

    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsImporting(true);
    setImportProgress('Leyendo y analizando archivo Excel/CSV...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rawJson = XLSX.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

        if (rawJson.length === 0) {
          setImportError('El archivo no contiene filas con datos válidos.');
          setIsImporting(false);
          return;
        }

        setImportProgress(`Mapeando ${rawJson.length} registros a las 23 columnas exactas...`);

        const mapped: HistoricalCandidate8k[] = rawJson.map((row: any, idx: number) => {
          // Columnas con variantes de encabezado tolerantes
          const getVal = (...keys: string[]) => {
            for (const k of keys) {
              if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                return String(row[k]).trim();
              }
            }
            return '';
          };

          const parseNum = (...keys: string[]) => {
            const raw = getVal(...keys);
            if (!raw) return null;
            const cleaned = Number(raw.replace(/[^0-9.-]+/g, ''));
            return isNaN(cleaned) ? null : cleaned;
          };

          return {
            id: `hist8k-${Date.now()}-${idx}`,
            nombre: sanitizeInputText(getVal('Nombre', 'nombre', 'NOMBRE', 'Candidato')) || 'Sin Nombre',
            genero: sanitizeInputText(getVal('Género', 'Genero', 'genero', 'GENERO', 'Sexo')),
            edad: parseNum('Edad', 'edad', 'EDAD'),
            numeroTelefonico: sanitizeInputText(getVal('Número telefónico', 'Numero telefonico', 'Teléfono', 'Telefono', 'telefono')),
            correo: sanitizeInputText(getVal('Correo', 'Email', 'correo', 'email', 'E-mail')),
            linkedin: safeExternalUrl(getVal('LinkedIn', 'Linkedin', 'linkedin', 'Perfil LinkedIn')),
            carreraPregrado: sanitizeInputText(getVal('Carrera (pregrado)', 'Carrera pregrado', 'Carrera', 'Profesion')),
            universidadPregrado: sanitizeInputText(getVal('Universidad (pregrado)', 'Universidad pregrado', 'Universidad')),
            maestria: sanitizeInputText(getVal('Maestría', 'Maestria', 'maestria', 'Posgrado')),
            casaEstudioMaestria: sanitizeInputText(getVal('Casa de estudio (Maestría)', 'Casa de estudio Maestría', 'Universidad Maestria')),
            especializacionesDiplomados: sanitizeInputText(getVal('Especializaciones/Diplomados', 'Especializaciones', 'Diplomados')),
            casaEstudioEspecializaciones: sanitizeInputText(getVal('Casa de estudio (Especializaciones/Diplomados)', 'Casa estudio especializaciones')),
            sueldoEstimacionSoles: parseNum('Sueldo (estimación) [mensuales & soles]', 'Sueldo', 'Sueldo estimación', 'Salario'),
            lineaEspecializacion: sanitizeInputText(getVal('Línea de especialización', 'Linea de especializacion', 'Especialidad')),
            area: sanitizeInputText(getVal('Área', 'Area', 'area')),
            aniosExperiencia: parseNum('Años de experiencia', 'Anios de experiencia', 'Experiencia'),
            ultimaPosicion: sanitizeInputText(getVal('Última posición', 'Ultima posicion', 'Cargo Actual', 'Posicion')),
            fechaUltimaPosicion: sanitizeInputText(getVal('Fecha de última posición', 'Fecha ultima posicion', 'Fecha')),
            nivelIngles: sanitizeInputText(getVal('Nivel de inglés', 'Nivel de ingles', 'Inglés', 'Ingles')),
            ultimaEmpresa: sanitizeInputText(getVal('Última empresa', 'Ultima empresa', 'Empresa')),
            numTrabajadoresUltimaEmpresa: sanitizeInputText(getVal('# de trabajadores (última empresa)', 'Trabajadores empresa', 'Tamano empresa')),
            facturacion2024Dolares: sanitizeInputText(getVal('Facturacion 2024 [dólares]', 'Facturacion 2024', 'Facturacion')),
            linkCv: safeExternalUrl(getVal('Link del CV', 'Link CV', 'CV', 'Enlace CV'))
          };
        });

        setImportProgress(`Guardando ${mapped.length} registros en IndexedDB de alta velocidad...`);
        await storage.importHistorical8kBatch(mapped);
        setImportStats({ total: mapped.length });
        onRefresh();
      } catch (err: any) {
        setImportError(`Error al procesar archivo: ${err.message || 'Formato no reconocido'}`);
      } finally {
        setIsImporting(false);
        setImportProgress(null);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleClearHistory = async () => {
    if (window.confirm('¿Estás seguro de vaciar completamente la Base Histórica? Esta acción borrará todas sus filas de IndexedDB.')) {
      await storage.clearHistorical8k();
      onRefresh();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
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
              Base Histórica
            </h1>
            <Badge variant="navy">Solo Lectura · 23 Columnas</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ats-text-secondary)' }}>
            Repositorio histórico indexado para consulta, auditoría y analítica de candidatos.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            variant="outline"
            size="md"
            icon={<Download size={16} />}
            onClick={handleDownloadTemplate}
          >
            Plantilla 23 Columnas
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<FileSpreadsheet size={16} />}
            onClick={handleExportToExcel}
            disabled={historicalData.length === 0}
          >
            Exportar a Excel ({filteredData.length})
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          backgroundColor: '#FFFFFF',
          padding: '8px 12px',
          borderRadius: 12,
          border: '1px solid var(--ats-border)'
        }}
      >
        <button
          onClick={() => setActiveTab('table')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: activeTab === 'table' ? 'var(--ats-navy)' : 'transparent',
            color: activeTab === 'table' ? '#FFF' : 'var(--ats-text-secondary)'
          }}
        >
          <Database size={16} />
          <span>Directorio Histórico ({historicalData.length.toLocaleString()} talentos)</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: activeTab === 'analytics' ? 'var(--ats-navy)' : 'transparent',
            color: activeTab === 'analytics' ? '#FFF' : 'var(--ats-text-secondary)'
          }}
        >
          <BarChart3 size={16} />
          <span>Analítica & Compensaciones Históricas</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: activeTab === 'import' ? 'var(--ats-navy)' : 'transparent',
            color: activeTab === 'import' ? '#FFF' : 'var(--ats-text-secondary)'
          }}
        >
          <Upload size={16} />
          <span>Cargar Base Histórica (Excel / CSV)</span>
        </button>

        {historicalData.length > 0 && (
          <button
            onClick={handleClearHistory}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Trash2 size={13} />
            <span>Vaciar Base Histórica</span>
          </button>
        )}
      </div>

      {/* TAB 1: DIRECTORY & 23-COLUMN TABLE */}
      {activeTab === 'table' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Multi Filter Bar */}
          <Card padding="md" style={{ backgroundColor: '#FFFFFF' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12
              }}
            >
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
                  placeholder="Buscar nombre, empresa, pregrado..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div>
                <select
                  className="ats-select"
                  style={{ fontSize: '0.85rem' }}
                  value={selectedArea}
                  onChange={(e) => {
                    setSelectedArea(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">Todas las Áreas ({availableAreas.length})</option>
                  {availableAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  className="ats-select"
                  style={{ fontSize: '0.85rem' }}
                  value={selectedEnglish}
                  onChange={(e) => {
                    setSelectedEnglish(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">Nivel de Inglés (Todos)</option>
                  <option value="Avanzado">Avanzado</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Básico">Básico</option>
                  <option value="Nativo">Nativo / Bilingüe</option>
                </select>
              </div>

              <div>
                <input
                  type="number"
                  className="ats-input"
                  style={{ fontSize: '0.85rem' }}
                  placeholder="Sueldo Mín (S/.)"
                  value={minSalary}
                  onChange={(e) => {
                    setMinSalary(e.target.value ? Number(e.target.value) : '');
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div>
                <input
                  type="number"
                  className="ats-input"
                  style={{ fontSize: '0.85rem' }}
                  placeholder="Sueldo Máx (S/.)"
                  value={maxSalary}
                  onChange={(e) => {
                    setMaxSalary(e.target.value ? Number(e.target.value) : '');
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Table Container with 23 exact columns */}
          {historicalData.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Database size={48} color="#94A3B8" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--ats-navy)', margin: '0 0 6px 0' }}>
                La Base Histórica está vacía
              </h3>
              <p style={{ color: 'var(--ats-text-muted)', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto 20px auto' }}>
                El sistema inicia con 0 datos de prueba. Haz clic en "Cargar Base Histórica" para importar tu archivo de candidatos.
              </p>
              <Button variant="primary" size="md" icon={<Upload size={16} />} onClick={() => setActiveTab('import')}>
                Ir al Importador de Base Histórica
              </Button>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: 'var(--ats-text-secondary)',
                  padding: '0 4px'
                }}
              >
                <span>
                  Mostrando <strong>{paginatedData.length}</strong> de <strong>{filteredData.length.toLocaleString()}</strong> candidatos filtrados (Total en DB: {historicalData.length.toLocaleString()})
                </span>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="ats-btn ats-btn-sm ats-btn-outline"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontWeight: 600, color: 'var(--ats-navy)' }}>
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="ats-btn ats-btn-sm ats-btn-outline"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* 23 Columns Table */}
              <div className="ats-table-container" style={{ maxHeight: 600, overflowY: 'auto' }}>
                <table className="ats-table" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Género</th>
                      <th>Edad</th>
                      <th>Teléfono / WhatsApp</th>
                      <th>Correo</th>
                      <th>LinkedIn</th>
                      <th>Carrera Pregrado</th>
                      <th>Universidad Pregrado</th>
                      <th>Maestría</th>
                      <th>Casa Maestría</th>
                      <th>Especializaciones</th>
                      <th>Casa Especialización</th>
                      <th>Sueldo Estimado (S/.)</th>
                      <th>Línea Especialización</th>
                      <th>Área</th>
                      <th>Años Exp.</th>
                      <th>Última Posición</th>
                      <th>Fecha Últ. Posición</th>
                      <th>Inglés</th>
                      <th>Última Empresa</th>
                      <th># Trabajadores</th>
                      <th>Facturación 2024</th>
                      <th>Link CV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => {
                      const cleanPhone = (row.numeroTelefonico || '').replace(/[^0-9]/g, '');
                      return (
                        <tr key={row.id}>
                          <td style={{ color: 'var(--ats-text-muted)' }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--ats-navy)' }}>{row.nombre}</td>
                          <td>{row.genero || '-'}</td>
                          <td>{row.edad || '-'}</td>
                          <td>
                            {row.numeroTelefonico ? (
                              <a
                                href={safeExternalUrl(`https://wa.me/${cleanPhone}`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  color: '#059669',
                                  fontWeight: 600
                                }}
                              >
                                <MessageSquare size={13} />
                                <span>{row.numeroTelefonico}</span>
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{row.correo || '-'}</td>
                          <td>
                            {row.linkedin ? (
                              <a
                                href={safeExternalUrl(row.linkedin)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#0066CC',
                                  fontWeight: 600
                                }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 0 0-1.64 1.64 1.64 1.64 0 0 0 1.64 1.64 1.64 1.64 0 0 0 1.64-1.64 1.64 1.64 0 0 0-1.64-1.64Z"/>
                                </svg>
                                <span>Ver Perfil</span>
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{row.carreraPregrado || '-'}</td>
                          <td>{row.universidadPregrado || '-'}</td>
                          <td>{row.maestria || '-'}</td>
                          <td>{row.casaEstudioMaestria || '-'}</td>
                          <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.especializacionesDiplomados || '-'}
                          </td>
                          <td>{row.casaEstudioEspecializaciones || '-'}</td>
                          <td style={{ fontWeight: 700, color: 'var(--ats-blue)' }}>
                            {row.sueldoEstimacionSoles
                              ? `S/. ${row.sueldoEstimacionSoles.toLocaleString('es-PE')}`
                              : '-'}
                          </td>
                          <td>{row.lineaEspecializacion || '-'}</td>
                          <td>
                            <Badge variant="navy">{row.area || 'General'}</Badge>
                          </td>
                          <td>{row.aniosExperiencia ? `${row.aniosExperiencia} años` : '-'}</td>
                          <td style={{ fontWeight: 600 }}>{row.ultimaPosicion || '-'}</td>
                          <td>{row.fechaUltimaPosicion || '-'}</td>
                          <td>
                            <Badge variant="cyan">{row.nivelIngles || 'N/A'}</Badge>
                          </td>
                          <td>{row.ultimaEmpresa || '-'}</td>
                          <td>{row.numTrabajadoresUltimaEmpresa || '-'}</td>
                          <td>{row.facturacion2024Dolares || '-'}</td>
                          <td>
                            {row.linkCv ? (
                              <a
                                href={safeExternalUrl(row.linkCv)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ats-btn ats-btn-sm ats-btn-primary"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                              >
                                <ExternalLink size={12} />
                                <span>Abrir CV</span>
                              </a>
                            ) : (
                              <span style={{ color: 'var(--ats-text-muted)' }}>Sin link</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANALYTICS & CHARTS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {historicalData.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--ats-text-muted)' }}>Carga datos históricos para visualizar la analítica.</p>
            </Card>
          ) : (
            <>
              {/* Top KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <Card padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ats-text-muted)', fontSize: '0.8rem' }}>
                    <span>Total Registros Históricos</span>
                    <Users size={16} color="#0066CC" />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ats-navy)', marginTop: 4 }}>
                    {historicalData.length.toLocaleString()}
                  </div>
                </Card>

                <Card padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ats-text-muted)', fontSize: '0.8rem' }}>
                    <span>Sueldo Promedio Estimado</span>
                    <DollarSign size={16} color="#00A3E0" />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0066CC', marginTop: 4 }}>
                    S/. {avgSalary.toLocaleString('es-PE')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 4 }}>
                    Piso S/. {minSal.toLocaleString('es-PE')} - Techo S/. {maxSal.toLocaleString('es-PE')}
                  </div>
                </Card>

                <Card padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ats-text-muted)', fontSize: '0.8rem' }}>
                    <span>Con Maestría / Posgrado</span>
                    <GraduationCap size={16} color="#10B981" />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#065F46', marginTop: 4 }}>
                    {Math.round((withMasterCount / historicalData.length) * 100)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 4 }}>
                    {withMasterCount.toLocaleString()} profesionales
                  </div>
                </Card>
              </div>

              {/* Areas Distribution */}
              <Card padding="lg">
                <h3 style={{ fontSize: '1.05rem', color: 'var(--ats-navy)', marginBottom: 16 }}>
                  Distribución de Talento Histórico por Área
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {availableAreas.slice(0, 8).map((areaName) => {
                    const count = historicalData.filter((i) => i.area === areaName).length;
                    const pct = Math.round((count / historicalData.length) * 100);
                    return (
                      <div key={areaName}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{areaName}</span>
                          <span style={{ color: 'var(--ats-blue)' }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ backgroundColor: '#F1F5F9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#0066CC', borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 3: MASS IMPORT DROPZONE FOR BASE HISTÓRICA */}
      {activeTab === 'import' && (
        <Card padding="lg">
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <Upload size={40} color="#0066CC" style={{ margin: '0 auto 12px auto' }} />
            <h2 style={{ fontSize: '1.4rem', color: 'var(--ats-navy)', marginBottom: 8 }}>
              Carga Masiva de la Base Histórica
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--ats-text-secondary)', marginBottom: 24 }}>
              Sube tu archivo `.xlsx` o `.csv`. El sistema reconocerá automáticamente las 23 columnas (A a la W) y guardará los registros en IndexedDB de manera inmediata.
            </p>

            {importStats && (
              <div
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #10B981',
                  color: '#065F46',
                  padding: 16,
                  borderRadius: 10,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left'
                }}
              >
                <CheckCircle2 size={24} color="#10B981" />
                <div>
                  <strong>¡Carga histórica completada con éxito!</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                    Se procesaron y guardaron <strong>{importStats.total.toLocaleString()}</strong> candidatos en el Archivo Histórico.
                  </p>
                </div>
              </div>
            )}

            {importError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #EF4444',
                  color: '#991B1B',
                  padding: 16,
                  borderRadius: 10,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left'
                }}
              >
                <AlertCircle size={24} color="#EF4444" />
                <div>
                  <strong>Error durante la importación</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>{importError}</p>
                </div>
              </div>
            )}

            {isImporting ? (
              <div style={{ padding: '36px 20px', backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid var(--ats-border)' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #0066CC', borderRightColor: 'transparent', borderRadius: '50%', animation: 'atsSpin 0.7s linear infinite', margin: '0 auto 12px auto' }} />
                <p style={{ fontWeight: 600, color: 'var(--ats-navy)', margin: 0 }}>
                  {importProgress || 'Importando base histórica...'}
                </p>
              </div>
            ) : (
              <div
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: 12,
                  padding: '40px 24px',
                  backgroundColor: '#F8FAFC',
                  position: 'relative',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
                <FileSpreadsheet size={36} color="#0066CC" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                  Arrastra tu archivo Excel/CSV de la Base Histórica aquí o haz clic para seleccionarlo
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ats-text-muted)', marginTop: 6 }}>
                  Soporta archivos `.xlsx`, `.xls` y `.csv` con las 23 columnas estandarizadas
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
