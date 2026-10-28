import React, { useState, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Vacancy2026 } from '../../types';
import { storage } from '../../lib/storage';
import { CustomQuestionsForm, validateCustomQuestions, serializeCustomAnswers } from './CustomQuestionsForm';
import {
  validateCvFile,
  generateSafeCvFilename,
  checkApplicationRateLimit,
  recordApplicationSubmission,
  checkDuplicateDniApplication,
  recordDniApplication
} from '../../lib/security';
import { uploadCvToGoogleDrive } from '../../lib/driveUpload';
import { pushCandidateToBigin } from '../../lib/biginService';
import {
  CheckCircle2,
  Upload,
  AlertCircle,
  FileText,
  Lock,
  ShieldCheck,
  Trash2,
  Check,
  Building2,
  Briefcase
} from 'lucide-react';

interface ApplicationFormModalProps {
  vacancy: Vacancy2026 | null; // null = Postulación Espontánea
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  vacancy,
  isOpen,
  onClose,
  onSuccess
}) => {
  // Candidate Base Information
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [edad, setEdad] = useState<number | ''>('');
  const [actualUltimaPosicion, setActualUltimaPosicion] = useState('');
  const [sectorRubro, setSectorRubro] = useState(vacancy?.sector || 'Minería y Metales');
  const [customSector, setCustomSector] = useState('');
  const [aniosExperiencia, setAniosExperiencia] = useState<number | ''>('');
  const [salarioActualUltimo, setSalarioActualUltimo] = useState<number | ''>('');
  const [inglesAvanzado, setInglesAvanzado] = useState<'Sí' | 'No'>('No');
  const [hasMaster, setHasMaster] = useState(false);
  const [masterDetails, setMasterDetails] = useState('');
  const [tipoEmpresa, setTipoEmpresa] = useState('Multinacional');

  // Mandatory CV File Upload
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic custom vacancy questions
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  // Security, Anti-Spam & Legal Consent state
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isSpontaneous = !vacancy;
  const folderDestination = vacancy?.folderName || '2026_Postulaciones_Espontaneas';

  const handleCustomAnswerChange = (questionId: string, val: any) => {
    setCustomAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setErrorMsg('');

    // Validación Binaria Estricta (Magic Bytes, extensión, no .doc, máx 5MB)
    const validation = await validateCvFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Archivo inválido.');
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCvFile(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nombre.trim() || !dni.trim() || !telefono.trim() || !correo.trim() || !actualUltimaPosicion.trim()) {
      setErrorMsg('Por favor completa todos los campos obligatorios (*).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setErrorMsg('Por favor ingresa un correo electrónico válido (ej: usuario@empresa.com).');
      return;
    }

    if (dni.trim().length < 6) {
      setErrorMsg('Por favor ingresa un documento de identidad válido.');
      return;
    }

    if (!edad || edad < 18 || edad > 85) {
      setErrorMsg('Por favor ingresa una edad válida.');
      return;
    }

    if (!salarioActualUltimo || salarioActualUltimo < 500) {
      setErrorMsg('Por favor ingresa una expectativa o salario mensual válido en Soles (S/.).');
      return;
    }

    if (hasMaster && !masterDetails.trim()) {
      setErrorMsg('Por favor especifica tu grado de posgrado, maestría o MBA y la institución.');
      return;
    }

    // 1. Anti-Bot Honeypot: si el bot llenó este campo oculto, simular éxito silenciosamente
    if (honeypot.trim().length > 0) {
      setIsSuccess(true);
      if (onSuccess) onSuccess();
      return;
    }

    // 2. Rate Limiting de Postulación (Máx 3 envíos por 5 minutos)
    const rateCheck = checkApplicationRateLimit();
    if (!rateCheck.allowed) {
      setErrorMsg(rateCheck.error || 'Límite temporal alcanzado. Por favor espera unos momentos.');
      return;
    }

    // 3. Validación de DNI Duplicado en la misma vacante en 24h
    const targetVacId = vacancy ? vacancy.id : 'SPONTANEOUS';
    if (checkDuplicateDniApplication(targetVacId, dni.trim())) {
      setErrorMsg('Ya se encuentra registrada una postulación con este documento de identidad para este proceso.');
      return;
    }

    // 4. Consentimiento Legal Obligatorio (Ley de Protección de Datos Personales)
    if (!privacyConsent) {
      setErrorMsg('Debes autorizar el tratamiento de datos personales conforme a la Ley de Protección de Datos Personales para continuar.');
      return;
    }

    // MANDATORY CV FILE VALIDATION
    if (!cvFile) {
      setErrorMsg('Es indispensable adjuntar tu archivo de Currículum Vitae (PDF o Word) para procesar tu postulación.');
      return;
    }

    // Custom Questions Validation (Idoneidad según el puesto)
    if (vacancy && vacancy.customQuestions && vacancy.customQuestions.length > 0) {
      const customValidationError = validateCustomQuestions(vacancy.customQuestions, customAnswers);
      if (customValidationError) {
        setErrorMsg(customValidationError);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const maestriaText = hasMaster ? `SÍ - ${masterDetails.trim()}` : 'No menciona';
      const finalSector = sectorRubro === 'Otro' ? customSector.trim() || 'Otro' : sectorRubro;
      
      // Carga automática del archivo CV a Google Drive Corporativo
      const driveUploadResult = await uploadCvToGoogleDrive({
        file: cvFile,
        candidateDni: dni.trim(),
        candidateName: nombre.trim(),
        vacancyTitle: vacancy ? vacancy.title : 'SPONTANEOUS',
        folderUrl: vacancy?.cvsFolderUrl || vacancy?.driveFolderUrl
      });
      const finalCvLink = driveUploadResult.linkCv;
      const serializedCustomAnswers = vacancy && vacancy.customQuestions 
        ? serializeCustomAnswers(vacancy.customQuestions, customAnswers)
        : customAnswers;

      await storage.submitWeb2026Application(
        {
          fecha: new Date().toISOString().slice(0, 10),
          nombre: nombre.trim(),
          dni: dni.trim(),
          telefono: telefono.trim(),
          correo: correo.trim(),
          edad: Number(edad),
          actualUltimaPosicion: actualUltimaPosicion.trim(),
          sectorRubro: finalSector,
          aniosExperiencia: Number(aniosExperiencia || 0),
          salarioActualUltimo: Number(salarioActualUltimo),
          inglesAvanzado,
          maestria: maestriaText,
          tipoEmpresa,
          linkCv: finalCvLink,
          customAnswers: serializedCustomAnswers
        },
        vacancy ? vacancy.id : 'SPONTANEOUS',
        serializedCustomAnswers,
        true
      );

      // Integración en vivo con Zoho Bigin CRM:
      if (vacancy) {
        pushCandidateToBigin({
          vacancy: {
            id: vacancy.id,
            title: vacancy.title,
            biginSubPipelineName: vacancy.biginSubPipelineName
          },
          candidate: {
            nombre: nombre.trim(),
            dni: dni.trim(),
            telefono: telefono.trim(),
            correo: correo.trim(),
            edad: Number(edad),
            actualUltimaPosicion: actualUltimaPosicion.trim(),
            sectorRubro: finalSector,
            aniosExperiencia: Number(aniosExperiencia || 0),
            salarioActualUltimo: Number(salarioActualUltimo),
            inglesAvanzado,
            maestria: maestriaText,
            tipoEmpresa,
            linkCv: finalCvLink
          },
          application: {
            customAnswers: serializedCustomAnswers
          }
        }).catch((bErr) => console.warn('[Bigin Background Push Warning]:', bErr));
      }

      recordApplicationSubmission();
      recordDniApplication(targetVacId, dni.trim());

      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch {
      setErrorMsg('Ocurrió un error al enviar tu postulación. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={isSpontaneous ? 'Postulación Espontánea · Red de Talento Ejecutivo' : `Postulación: ${vacancy?.title}`}
      subtitle={
        isSpontaneous
          ? 'Registro confidencial para la Red de Talento Ejecutivo'
          : `Convocatoria Ejecutiva · ${vacancy?.location || 'Latinoamérica'}`
      }
      maxWidth="760px"
    >
      {isSuccess ? (
        <div style={{ textAlign: 'center', padding: '36px 16px' }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 0 6px rgba(16, 185, 129, 0.12)'
            }}
          >
            <CheckCircle2 size={40} color="#10B981" />
          </div>

          <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--ats-navy)', marginBottom: 8 }}>
            ¡Postulación Enviada con Éxito!
          </h3>

          <p style={{ color: 'var(--ats-text-secondary)', fontSize: '0.92rem', maxWidth: 460, margin: '0 auto 20px auto', lineHeight: 1.6 }}>
            {isSpontaneous
              ? 'Tus datos y CV han sido ingresados en nuestra Base General de Talento Ejecutivo para futuras búsquedas directivas.'
              : `Tu expediente y archivo de CV han sido asociados exitosamente a la posición de ${vacancy?.title}.`}
          </p>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--ats-border)',
              borderRadius: 10,
              padding: '14px 20px',
              textAlign: 'left',
              maxWidth: 420,
              margin: '0 auto 24px auto',
              fontSize: '0.85rem'
            }}
          >
            <div><span style={{ color: 'var(--ats-text-muted)' }}>Candidato:</span> <strong>{nombre}</strong></div>
            <div style={{ marginTop: 4 }}><span style={{ color: 'var(--ats-text-muted)' }}>Documento:</span> <strong>{dni}</strong></div>
            <div style={{ marginTop: 4 }}><span style={{ color: 'var(--ats-text-muted)' }}>CV Registrado:</span> <strong style={{ color: '#0066CC' }}>{cvFile?.name}</strong></div>
            <div style={{ marginTop: 4 }}><span style={{ color: 'var(--ats-text-muted)' }}>Almacenamiento:</span> <strong style={{ color: '#059669' }}>Google Drive Corporativo ✓</strong></div>
          </div>

          <Button variant="primary" size="md" onClick={handleReset}>
            Entendido, cerrar
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#991B1B',
                fontSize: '0.85rem'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. INFORMACIÓN PERSONAL Y DE CONTACTO */}
          <div>
            <div
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: 'var(--ats-blue)',
                borderBottom: '1px solid var(--ats-border)',
                paddingBottom: 6,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ backgroundColor: '#EBF4FC', color: '#0066CC', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>1</span>
              <span>Información Personal y de Contacto</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Nombre Completo <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="ats-input"
                  placeholder="Ej: Carlos Mendoza"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Documento de Identidad (DNI) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="ats-input"
                  placeholder="Ej: 43928104"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  required
                />
              </div>

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Teléfono / WhatsApp Directo <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  className="ats-input"
                  placeholder="+51 984 123 456"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  required
                />
              </div>

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Correo Electrónico <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  className="ats-input"
                  placeholder="ejemplo@empresa.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Edad (Años) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  className="ats-input"
                  placeholder="Ej: 42"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value ? Number(e.target.value) : '')}
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. TRAYECTORIA DIRECTIVA Y COMPENSACIÓN */}
          <div>
            <div
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: 'var(--ats-blue)',
                borderBottom: '1px solid var(--ats-border)',
                paddingBottom: 6,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ backgroundColor: '#EBF4FC', color: '#0066CC', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>2</span>
              <span>Trayectoria Directiva y Compensación</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Actual o Última Posición <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="ats-input"
                  placeholder="Ej: Gerente de Operaciones"
                  value={actualUltimaPosicion}
                  onChange={(e) => setActualUltimaPosicion(e.target.value)}
                  required
                />
              </div>

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Sector / Rubro Principal <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  className="ats-select"
                  value={sectorRubro}
                  onChange={(e) => setSectorRubro(e.target.value)}
                >
                  <option value="Minería y Metales">Minería y Metales</option>
                  <option value="Banca y Finanzas">Banca y Finanzas</option>
                  <option value="Consumo Masivo">Consumo Masivo</option>
                  <option value="Retail & E-commerce">Retail & E-commerce</option>
                  <option value="Industrial y Manufactura">Industrial y Manufactura</option>
                  <option value="Tecnología & Software">Tecnología & Software</option>
                  <option value="Agroindustria">Agroindustria</option>
                  <option value="Energía & Oil/Gas">Energía & Oil/Gas</option>
                  <option value="Servicios Profesionales">Servicios Profesionales</option>
                  <option value="Salud y Farmacéutica">Salud y Farmacéutica</option>
                  <option value="Logística & Supply Chain">Logística & Supply Chain</option>
                  <option value="Otro">Otro (Especificar)</option>
                </select>
              </div>

              {sectorRubro === 'Otro' && (
                <div className="ats-input-group" style={{ margin: 0 }}>
                  <label className="ats-label">Especifica Sector</label>
                  <input
                    type="text"
                    className="ats-input"
                    placeholder="Menciona tu sector"
                    value={customSector}
                    onChange={(e) => setCustomSector(e.target.value)}
                  />
                </div>
              )}

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Años de Experiencia Ejecutiva <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  className="ats-input"
                  placeholder="Ej: 15"
                  value={aniosExperiencia}
                  onChange={(e) => setAniosExperiencia(e.target.value ? Number(e.target.value) : '')}
                  required
                />
              </div>

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Salario Actual o Pretensión (S/.) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  className="ats-input"
                  placeholder="Ej: 24000"
                  value={salarioActualUltimo}
                  onChange={(e) => setSalarioActualUltimo(e.target.value ? Number(e.target.value) : '')}
                  required
                />
              </div>

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  ¿Tienes Inglés Avanzado / Profesional? <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 42, paddingLeft: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ats-navy)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="modalInglesAvanzado"
                      value="Sí"
                      checked={inglesAvanzado === 'Sí'}
                      onChange={() => setInglesAvanzado('Sí')}
                    />
                    <span>Sí</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ats-navy)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="modalInglesAvanzado"
                      value="No"
                      checked={inglesAvanzado === 'No'}
                      onChange={() => setInglesAvanzado('No')}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div className="ats-input-group" style={{ margin: 0 }}>
                <label className="ats-label">
                  Tipo de Empresa más reciente <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  className="ats-select"
                  value={tipoEmpresa}
                  onChange={(e) => setTipoEmpresa(e.target.value)}
                >
                  <option value="Multinacional">Multinacional</option>
                  <option value="Nacional Grande">Nacional Grande</option>
                  <option value="Mediana / Familiar">Mediana / Familiar</option>
                  <option value="PYME">PYME</option>
                  <option value="Startup">Startup / Scale-up</option>
                  <option value="Consultora">Consultora</option>
                </select>
              </div>
            </div>

            {/* Maestría / Posgrado */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid var(--ats-border)',
                marginTop: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                  ¿Cuentas con grado de Posgrado / Maestría / MBA?
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--ats-navy)' }}>
                  <input
                    type="radio"
                    name="hasMasterModal"
                    checked={hasMaster}
                    onChange={() => setHasMaster(true)}
                  />
                  <span>Sí</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--ats-navy)' }}>
                  <input
                    type="radio"
                    name="hasMasterModal"
                    checked={!hasMaster}
                    onChange={() => {
                      setHasMaster(false);
                      setMasterDetails('');
                    }}
                  />
                  <span>No</span>
                </label>
              </div>

              {hasMaster && (
                <div style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    className="ats-input"
                    placeholder="Menciona tu grado, especialidad e institución académica..."
                    value={masterDetails}
                    onChange={(e) => setMasterDetails(e.target.value)}
                    required={hasMaster}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3. PREGUNTAS DINÁMICAS DEL PUESTO (Si aplica) */}
          {vacancy && vacancy.customQuestions && vacancy.customQuestions.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--ats-blue)',
                  borderBottom: '1px solid var(--ats-border)',
                  paddingBottom: 6,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span style={{ backgroundColor: '#EBF4FC', color: '#0066CC', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>3</span>
                <span>Evaluación de Idoneidad para el Cargo</span>
              </div>

              <CustomQuestionsForm
                questions={vacancy.customQuestions}
                values={customAnswers}
                onChange={handleCustomAnswerChange}
              />
            </div>
          )}

          {/* 4. HOJA DE VIDA / CV (OBLIGATORIO) */}
          <div>
            <div
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: 'var(--ats-blue)',
                borderBottom: '1px solid var(--ats-border)',
                paddingBottom: 6,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ backgroundColor: '#EBF4FC', color: '#0066CC', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                {vacancy?.customQuestions && vacancy.customQuestions.length > 0 ? '4' : '3'}
              </span>
              <span>Currículum Vitae Ejecutivo (Obligatorio)</span>
            </div>

            {/* Dropzone Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                if (!cvFile && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              style={{
                border: isDragging ? '2px dashed #0066CC' : cvFile ? '2px solid #10B981' : '2px dashed #CBD5E1',
                borderRadius: 10,
                padding: cvFile ? '16px' : '28px 16px',
                textAlign: 'center',
                backgroundColor: isDragging ? '#EFF6FF' : cvFile ? '#F0FDF4' : '#F8FAFC',
                cursor: cvFile ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />

              {cvFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <FileText size={22} color="#15803D" />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                        {cvFile.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Check size={12} />
                        <span>{formatFileSize(cvFile.size)} · Listo para enviar</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--ats-border)',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--ats-navy)',
                        cursor: 'pointer'
                      }}
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCvFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        backgroundColor: '#FEE2E2',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 10px',
                        color: '#DC2626',
                        cursor: 'pointer'
                      }}
                      title="Quitar archivo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={24} color="#0066CC" style={{ margin: '0 auto 6px auto' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                    Haz clic aquí para adjuntar tu CV (PDF o Word)
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--ats-text-muted)' }}>
                    Formatos admitidos: .pdf, .docx con Magic Bytes · Máx. 5MB
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 8 }}>
              <Lock size={12} color="#0066CC" />
              <span>Documento encriptado y de estricta reserva ejecutiva.</span>
            </div>
          </div>

          {/* Honeypot invisible anti-spam */}
          <input
            type="text"
            name="ats_company_site_hp"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ display: 'none', position: 'absolute', left: '-9999px', opacity: 0 }}
            tabIndex={-1}
            autoComplete="off"
          />

          {/* Consentimiento Legal de Tratamiento de Datos Personales (PII) */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #CBD5E1',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10
            }}
          >
            <input
              type="checkbox"
              id="modalPrivacyConsent"
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--ats-blue)', cursor: 'pointer' }}
              required
            />
            <label
              htmlFor="modalPrivacyConsent"
              style={{
                fontSize: '0.8rem',
                lineHeight: 1.45,
                color: 'var(--ats-navy)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Autorizo el tratamiento de mis datos personales y CV para procesos de selección ejecutiva actuales y futuros, conforme a la Ley de Protección de Datos Personales. <span style={{ color: '#EF4444' }}>*</span>
            </label>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--ats-border)', paddingTop: 16 }}>
            <Button variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
              Enviar Postulación Confidencial
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
