import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Vacancy2026, Candidate2026, Application2026, CustomQuestion, VacancyStatus } from '../../types';
import { storage } from '../../lib/storage';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Folder,
  Sliders,
  FolderGit2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { safeExternalUrl, sanitizeInputText } from '../../lib/security';

interface Import2026ProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const Import2026ProcessModal: React.FC<Import2026ProcessModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobCode, setJobCode] = useState(`ATS-2026-${Math.floor(Math.random() * 90 + 10)}`);
  const [jobStatus, setJobStatus] = useState<VacancyStatus>('closed'); // Por defecto cerrado/histórico 2026 para los 20 puestos pasados
  const [sector, setSector] = useState('Consumo Masivo');
  const [folderName, setFolderName] = useState('');
  const [jobFolderUrl, setJobFolderUrl] = useState('');
  const [cvsFolderUrl, setCvsFolderUrl] = useState('');
  const [existingSheetUrl, setExistingSheetUrl] = useState('');

  // File parsed data
  const [fileName, setFileName] = useState('');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [detectedCustomQuestions, setDetectedCustomQuestions] = useState<CustomQuestion[]>([]);
  const [parsedCandidates, setParsedCandidates] = useState<Candidate2026[]>([]);
  const [parsedApplications, setParsedApplications] = useState<Application2026[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-generate folder name on title change
  const handleTitleChange = (val: string) => {
    setJobTitle(val);
    const clean = val
      .trim()
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/g, '_')
      .replace(/^_+|_+$/g, '');
    setFolderName(`2026_${clean}`);
  };

  // Normalizer helper: strips accents, lowercases, trims
  const normalizeHeader = (h: string) =>
    h
      .trim()
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  type BaseColKey =
    | 'fecha'
    | 'nombre'
    | 'dni'
    | 'telefono'
    | 'correo'
    | 'edad'
    | 'actualUltimaPosicion'
    | 'sectorRubro'
    | 'aniosExperiencia'
    | 'salarioActualUltimo'
    | 'inglesAvanzado'
    | 'maestria'
    | 'tipoEmpresa';

  const matchBaseColumn = (rawHeader: string): BaseColKey | null => {
    const h = normalizeHeader(rawHeader);
    if (h === 'fecha' || h === 'date') return 'fecha';
    if (h === 'nombre' || h === 'nombres' || h === 'candidato' || h === 'nombre completo' || h === 'full name') return 'nombre';
    if (h === 'dni' || h === 'documento' || h === 'cedula' || h === 'rut' || h === 'identificacion' || h === 'id') return 'dni';
    if (h === 'telefono' || h === 'telefono / whatsapp' || h === 'celular' || h === 'whatsapp' || h === 'phone') return 'telefono';
    if (h === 'correo' || h === 'correo electronico' || h === 'email' || h === 'mail' || h === 'e-mail') return 'correo';
    if (h === 'edad' || h === 'age') return 'edad';
    if (
      h === 'actual o ultima posicion' ||
      h === 'actual o ultima posicion (cargo)' ||
      h === 'ultima posicion' ||
      h === 'cargo actual' ||
      h === 'posicion actual'
    ) return 'actualUltimaPosicion';
    if (h === 'sector / rubro' || h === 'sector' || h === 'rubro' || h === 'industria') return 'sectorRubro';
    if (h === 'anos de experiencia' || h === 'anios de experiencia' || h === 'tiempo de experiencia') return 'aniosExperiencia';
    if (
      h === 'salario actual o ultimo salario' ||
      h === 'salario actual' ||
      h === 'ultimo salario' ||
      h === 'sueldo actual' ||
      h === 'expectativa salarial'
    ) return 'salarioActualUltimo';
    if (h === 'ingles avanzado' || h === 'ingles' || h === 'nivel de ingles') return 'inglesAvanzado';
    if (h === 'maestria' || h === 'mba' || h === 'posgrado') return 'maestria';
    if (h === 'tipo de empresa' || h === 'tipo empresa') return 'tipoEmpresa';
    return null;
  };

  const matchCvLink = (rawHeader: string): boolean => {
    const h = normalizeHeader(rawHeader);
    return (
      h === 'link del cv' ||
      h === 'link cv' ||
      h === 'cv' ||
      h === 'enlace cv' ||
      h === 'url cv' ||
      h === 'archivo cv' ||
      h === 'curriculum'
    );
  };

  const normalizeEnglish = (val: any): 'Sí' | 'No' => {
    if (val === undefined || val === null) return 'No';
    const str = String(val).trim().toLowerCase();
    if (
      ['sí', 'si', 'yes', 'true', '1', 'avanzado', 'advanced', 'bilingüe', 'bilingue', 'nativo'].includes(str)
    ) {
      return 'Sí';
    }
    return 'No';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setFileName(file.name);

    // Auto set title from file name if empty
    if (!jobTitle) {
      const suggested = file.name
        .replace(/\.(xlsx|xls|csv)$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      handleTitleChange(suggested);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

        if (jsonData.length === 0) {
          setErrorMsg('El archivo no contiene filas con datos.');
          return;
        }

        // Get headers from sheet in original order
        const headers: string[] = [];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
          if (cell && cell.v !== undefined && cell.v !== null) {
            headers.push(String(cell.v).trim());
          }
        }

        setDetectedColumns(headers);

        // Map column headers to their detected roles
        const baseHeaderMap: Partial<Record<BaseColKey, string>> = {};
        let cvHeader: string | null = null;
        const customQHeaders: string[] = [];

        headers.forEach((h) => {
          const baseKey = matchBaseColumn(h);
          if (baseKey && !baseHeaderMap[baseKey]) {
            baseHeaderMap[baseKey] = h;
          } else if (matchCvLink(h) && !cvHeader) {
            cvHeader = h;
          } else {
            // Regla estricta: Toda columna que no sea una de las 12 base fijas ni el Link del CV
            // se convierte automáticamente en una Pregunta Personalizada
            customQHeaders.push(h);
          }
        });

        const customQuestions: CustomQuestion[] = customQHeaders.map((headerText, idx) => ({
          id: `cq-${idx}-${headerText.slice(0, 20).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          label: headerText,
          type: 'text',
          required: false
        }));

        setDetectedCustomQuestions(customQuestions);

        // Map candidate rows and applications
        const candidates: Candidate2026[] = [];
        const applications: Application2026[] = [];
        const vacancyId = `vac-2026-${Date.now()}`;

        jsonData.forEach((row: any, idx: number) => {
          const getBaseVal = (key: BaseColKey, fallback: any = '') => {
            const h = baseHeaderMap[key];
            if (h && row[h] !== undefined && row[h] !== null) {
              return String(row[h]).trim();
            }
            return fallback;
          };

          const dniRaw = getBaseVal('dni', `DNI-2026-${idx + 1}`);
          const dni = dniRaw.replace(/[^0-9a-zA-Z-]/g, '') || `DNI-2026-${idx + 1}`;
          const nombre = sanitizeInputText(getBaseVal('nombre', `Candidato ${idx + 1}`));
          const fecha = sanitizeInputText(getBaseVal('fecha', new Date().toISOString().slice(0, 10)));
          const telefono = sanitizeInputText(getBaseVal('telefono', ''));
          const correo = sanitizeInputText(getBaseVal('correo', ''));
          const edad = sanitizeInputText(getBaseVal('edad', '38'));
          const cargo = sanitizeInputText(getBaseVal('actualUltimaPosicion', 'Ejecutivo'));
          const sec = sanitizeInputText(getBaseVal('sectorRubro', sector));
          const exp = sanitizeInputText(getBaseVal('aniosExperiencia', '10'));
          const sueldo = sanitizeInputText(getBaseVal('salarioActualUltimo', '20000'));
          const inglesRaw = getBaseVal('inglesAvanzado', 'No');
          const ingles = normalizeEnglish(inglesRaw);
          const maestria = sanitizeInputText(getBaseVal('maestria', 'No menciona'));
          const tipoEmpresa = sanitizeInputText(getBaseVal('tipoEmpresa', 'Multinacional'));

          // Link del CV sanitizado
          let linkCv = '';
          if (cvHeader && row[cvHeader]) {
            linkCv = safeExternalUrl(String(row[cvHeader]).trim());
          }

          // Respuestas a 100% de las preguntas personalizadas detectadas
          const customAnswers: Record<string, any> = {};
          customQuestions.forEach((cq) => {
            const val = row[cq.label];
            customAnswers[cq.id] = val !== undefined && val !== null ? sanitizeInputText(String(val).trim()) : '';
          });

          const candidateObj: Candidate2026 = {
            id: `cand-2026-${dni}`,
            fecha,
            nombre,
            dni,
            telefono,
            correo,
            edad,
            actualUltimaPosicion: cargo,
            sectorRubro: sec,
            aniosExperiencia: exp,
            salarioActualUltimo: sueldo,
            inglesAvanzado: ingles,
            maestria,
            tipoEmpresa,
            linkCv,
            customAnswers,
            createdAt: new Date().toISOString()
          };

          const appObj: Application2026 = {
            id: `app-2026-${vacancyId}-${idx}`,
            vacancyId,
            candidateDni: dni,
            appliedAt: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
            status: 'recibido',
            customAnswers,
            linkCv
          };

          candidates.push(candidateObj);
          applications.push(appObj);
        });

        setParsedCandidates(candidates);
        setParsedApplications(applications);
      } catch (err: any) {
        setErrorMsg(`Error procesando CSV: ${err.message || 'Estructura no válida'}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (!jobTitle.trim()) {
      setErrorMsg('Por favor ingresa el Nombre del Puesto.');
      return;
    }

    if (parsedCandidates.length === 0) {
      setErrorMsg('No se detectaron candidatos en el archivo para importar.');
      return;
    }

    setIsProcessing(true);

    try {
      const safeJobUrl = jobFolderUrl.trim() ? safeExternalUrl(jobFolderUrl.trim()) : undefined;
      const safeCvsUrl = cvsFolderUrl.trim() ? safeExternalUrl(cvsFolderUrl.trim()) : undefined;
      const safeSheetUrl = existingSheetUrl.trim() ? safeExternalUrl(existingSheetUrl.trim()) : undefined;

      const vacancyObj: Vacancy2026 = {
        id: `vac-2026-${Date.now()}`,
        code: jobCode,
        title: jobTitle.trim(),
        status: jobStatus,
        sector,
        location: 'Lima, Perú / Regional',
        modality: 'Híbrido',
        description: `Proceso de selección para ${jobTitle.trim()} (Cargado desde CSV 2026).`,
        requirements: ['Trayectoria ejecutiva comprobada en la posición'],
        folderName: folderName.trim() || `2026_${jobTitle.trim().replace(/\s+/g, '_')}`,
        jobFolderUrl: safeJobUrl === '#' ? undefined : safeJobUrl,
        cvsFolderUrl: safeCvsUrl === '#' ? undefined : safeCvsUrl,
        driveFolderUrl: safeCvsUrl === '#' ? undefined : safeCvsUrl,
        googleSheetUrl: safeSheetUrl === '#' ? undefined : safeSheetUrl,
        googleSheetFileId: undefined, // PROHIBIDO crear archivo nuevo en Drive al importar CSV
        isImportedHistorical: true, // Proceso histórico de 2026 ya existente en Drive
        customQuestions: detectedCustomQuestions,
        isImportedCsv: true,
        createdAt: new Date().toISOString(),
        closedAt: jobStatus === 'closed' ? new Date().toISOString() : undefined
      };

      // Correct vacancyId in applications
      const apps = parsedApplications.map((a) => ({ ...a, vacancyId: vacancyObj.id }));

      await storage.import2026ProcessFromCsv(vacancyObj, parsedCandidates, apps);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(`Error al guardar en base de datos: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar Puesto desde CSV / Excel (Formato 2026)"
      subtitle="Reconoce automáticamente las 12 columnas fijas (A-L) y crea preguntas dinámicas con las columnas intermedias"
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {errorMsg && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #EF4444',
              color: '#991B1B',
              padding: 12,
              borderRadius: 8,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Fields: Puesto, Código, Estado y Carpeta */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Nombre del Puesto / Proceso</label>
            <input
              type="text"
              className="ats-input"
              placeholder="Ej: Gerente Comercial Regional"
              value={jobTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
            />
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Código</label>
            <input
              type="text"
              className="ats-input"
              value={jobCode}
              onChange={(e) => setJobCode(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Estado del Puesto</label>
            <select
              className="ats-select"
              value={jobStatus}
              onChange={(e) => setJobStatus(e.target.value as VacancyStatus)}
            >
              <option value="closed">● Cerrado / Histórico 2026 (Para los 20 puestos pasados)</option>
              <option value="active">● Activo (Visible en el Portal Web)</option>
              <option value="paused">● Pausado</option>
            </select>
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Sector / Industria</label>
            <select
              className="ats-select"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            >
              <option value="Minería y Metales">Minería y Metales</option>
              <option value="Banca y Finanzas">Banca y Finanzas</option>
              <option value="Consumo Masivo">Consumo Masivo</option>
              <option value="Retail & E-commerce">Retail & E-commerce</option>
              <option value="Tecnología & Software">Tecnología & Software</option>
              <option value="Agroindustria">Agroindustria</option>
              <option value="Industrial y Manufactura">Industrial y Manufactura</option>
              <option value="Servicios Profesionales">Servicios Profesionales</option>
            </select>
          </div>
        </div>

        {/* GESTIÓN DE CARPETAS DE GOOGLE DRIVE: JOB Y CVS */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid var(--ats-border)',
            borderRadius: 10,
            padding: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Folder size={18} color="#0066CC" />
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ats-navy)' }}>
              Carpetas de Google Drive Asociadas al Proceso
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="ats-input-group" style={{ margin: 0 }}>
              <label className="ats-label">1. Carpeta / Perfil del Job (Drive)</label>
              <input
                type="url"
                className="ats-input"
                placeholder="https://drive.google.com/drive/folders/..."
                value={jobFolderUrl}
                onChange={(e) => setJobFolderUrl(e.target.value)}
              />
            </div>

            <div className="ats-input-group" style={{ margin: 0 }}>
              <label className="ats-label">2. Carpeta de los CVs (Drive)</label>
              <input
                type="url"
                className="ats-input"
                placeholder="https://drive.google.com/drive/folders/..."
                value={cvsFolderUrl}
                onChange={(e) => setCvsFolderUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="ats-input-group" style={{ margin: 0, marginBottom: 12 }}>
            <label className="ats-label">
              Link del Excel/Sheet existente en Drive (Opcional)
            </label>
            <input
              type="url"
              className="ats-input"
              placeholder="https://docs.google.com/spreadsheets/d/... o enlace al Excel en Drive"
              value={existingSheetUrl}
              onChange={(e) => setExistingSheetUrl(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 4 }}>
              Si pegas el enlace, se guardará como acceso directo de lectura. NO se creará ningún archivo en Drive para evitar duplicar.
            </span>
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Nombre de la Carpeta del Puesto</label>
            <input
              type="text"
              className="ats-input"
              placeholder="2026_Gerente_Comercial"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          </div>
        </div>

        {/* Dropzone for CSV */}
        <div
          style={{
            border: '2px dashed #CBD5E1',
            borderRadius: 10,
            padding: '24px 16px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            position: 'relative',
            cursor: 'pointer'
          }}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
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
          <FileSpreadsheet size={32} color="#0066CC" style={{ margin: '0 auto 8px auto' }} />
          {fileName ? (
            <div>
              <strong style={{ color: 'var(--ats-navy)', fontSize: '0.9rem' }}>{fileName}</strong>
              <div style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>
                ✓ {parsedCandidates.length} candidatos detectados
              </div>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ats-navy)' }}>
                Sube el archivo CSV/Excel del puesto
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--ats-text-muted)' }}>
                Se detectarán automáticamente las 12 columnas base + preguntas personalizadas intermedias
              </p>
            </div>
          )}
        </div>

        {/* Resumen visual completo requerido en Requisito 1 */}
        {fileName && (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: 10,
              padding: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle2 size={18} color="#16A34A" />
              <strong style={{ fontSize: '0.92rem', color: '#14532D' }}>
                12 columnas base detectadas + {detectedCustomQuestions.length} preguntas personalizadas detectadas
              </strong>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: 10, lineHeight: 1.4 }}>
              ✓ <strong>12 Columnas Fijas Base:</strong> Fecha, Nombre, DNI, Teléfono, Edad, Actual o última posición, Sector / Rubro, Años de experiencia, Salario actual, Inglés avanzado (Sí/No), Maestría, Tipo de empresa + Link del CV.
            </div>

            {detectedCustomQuestions.length > 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                  Preguntas Personalizadas / Adicionales del Puesto ({detectedCustomQuestions.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detectedCustomQuestions.map((q) => (
                    <Badge key={q.id} variant="blue" style={{ fontSize: '0.78rem', padding: '4px 8px' }}>
                      {q.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#15803D' }}>
                (No se detectaron preguntas personalizadas adicionales en este archivo)
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button variant="outline" size="md" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<CheckCircle2 size={16} />}
            onClick={handleConfirmImport}
            isLoading={isProcessing}
            disabled={parsedCandidates.length === 0 || !jobTitle.trim()}
          >
            Crear Puesto e Importar {parsedCandidates.length} Postulantes
          </Button>
        </div>
      </div>
    </Modal>
  );
};
