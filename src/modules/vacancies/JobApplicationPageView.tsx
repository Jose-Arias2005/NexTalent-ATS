import React, { useState, useRef } from 'react';
import { Vacancy2026, CustomQuestion } from '../../types';
import { storage } from '../../lib/storage';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
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
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Send,
  AlertTriangle,
  GraduationCap,
  Languages,
  DollarSign,
  ShieldCheck,
  Lock,
  Trash2,
  Check
} from 'lucide-react';

interface JobApplicationPageViewProps {
  vacancy: Vacancy2026 | undefined;
  onNavigateHome: () => void;
  onOpenSpontaneous: () => void;
  onSuccessSubmit: () => void;
}

export const JobApplicationPageView: React.FC<JobApplicationPageViewProps> = ({
  vacancy,
  onNavigateHome,
  onOpenSpontaneous,
  onSuccessSubmit
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
  const [safeCvFilename, setSafeCvFilename] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  if (!vacancy) {
    return (
      <div className="ats-container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <Card padding="lg" style={{ maxWidth: 580, margin: '0 auto', boxShadow: 'var(--ats-shadow-lg)' }}>
          <AlertCircle size={52} color="#EF4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.6rem', color: 'var(--ats-navy)', marginBottom: 8, fontWeight: 800 }}>
            Convocatoria No Disponible
          </h2>
          <p style={{ color: 'var(--ats-text-secondary)', marginBottom: 28, fontSize: '0.95rem', lineHeight: 1.6 }}>
            El enlace solicitado no corresponde a ningún proceso activo en la plataforma o ha sido cerrado por el comité de selección.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            <Button variant="primary" size="md" icon={<ArrowLeft size={16} />} onClick={onNavigateHome}>
              Ver Oportunidades Activas
            </Button>
            <Button variant="outline" size="md" icon={<Send size={16} />} onClick={onOpenSpontaneous}>
              Postulación Espontánea
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isClosedOrPaused = vacancy.status === 'closed' || vacancy.status === 'paused';
  const folderDestination = vacancy.folderName || `2026_${vacancy.title.replace(/\s+/g, '_')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nombre.trim() || !dni.trim() || !telefono.trim() || !correo.trim() || !actualUltimaPosicion.trim()) {
      setErrorMsg('Por favor completa todos los campos obligatorios marcados con asterisco (*).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setErrorMsg('Por favor ingresa un correo electrónico válido (ej: usuario@empresa.com).');
      return;
    }

    if (dni.trim().length < 6) {
      setErrorMsg('Por favor ingresa un número de documento de identidad válido.');
      return;
    }

    if (!edad || Number(edad) < 18 || Number(edad) > 85) {
      setErrorMsg('Por favor ingresa una edad válida.');
      return;
    }

    if (!salarioActualUltimo || Number(salarioActualUltimo) < 500) {
      setErrorMsg('Por favor ingresa una expectativa o compensación mensual válida en Soles (S/.).');
      return;
    }

    if (hasMaster && !masterDetails.trim()) {
      setErrorMsg('Por favor especifica el nombre de tu posgrado, maestría o MBA y la institución.');
      return;
    }

    // 1. Anti-Bot Honeypot: si el bot llenó este campo oculto, simular éxito silenciosamente
    if (honeypot.trim().length > 0) {
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Rate Limiting de Postulación (Máx 3 envíos por 5 minutos)
    const rateCheck = checkApplicationRateLimit();
    if (!rateCheck.allowed) {
      setErrorMsg(rateCheck.error || 'Límite temporal alcanzado. Por favor espera unos momentos.');
      return;
    }

    // 3. Validación de DNI Duplicado en la misma vacante en 24h
    if (checkDuplicateDniApplication(vacancy.id, dni.trim())) {
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
    if (vacancy.customQuestions && vacancy.customQuestions.length > 0) {
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
        vacancyTitle: vacancy.title,
        folderUrl: vacancy.cvsFolderUrl || vacancy.driveFolderUrl
      });
      setSafeCvFilename(driveUploadResult.filename);
      const finalCvLink = driveUploadResult.linkCv;
      const serializedCustomAnswers = serializeCustomAnswers(vacancy.customQuestions, customAnswers);

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
        vacancy.id,
        serializedCustomAnswers,
        true
      );

      // Integración en vivo con Zoho Bigin CRM:
      // Contacto creado/actualizado y registro en 'Preseleccionados' disparando el workflow de correo
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

      recordApplicationSubmission();
      recordDniApplication(vacancy.id, dni.trim());

      setIsSuccess(true);
      onSuccessSubmit();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErrorMsg('Ocurrió un error al registrar la postulación. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Top Header Navigation */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--ats-border)',
          padding: '16px 0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(8px)',
          background: 'rgba(255, 255, 255, 0.95)'
        }}
      >
        <div className="ats-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={onNavigateHome}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--ats-navy)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 8,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ArrowLeft size={16} color="#0066CC" />
            <span>Volver a Convocatorias</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--ats-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#10B981" />
              <span>Proceso Oficial & Confidencial</span>
            </span>
          </div>
        </div>
      </div>

      <div className="ats-container" style={{ maxWidth: 860, marginTop: 32 }}>
        {isSuccess ? (
          <Card padding="lg" style={{ textAlign: 'center', padding: '60px 32px', boxShadow: 'var(--ats-shadow-lg)' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.12)'
              }}
            >
              <CheckCircle2 size={44} color="#10B981" />
            </div>

            <Badge variant="success">Postulación Confirmada</Badge>

            <h2 style={{ fontSize: '1.85rem', color: 'var(--ats-navy)', marginTop: 16, marginBottom: 8, fontWeight: 800 }}>
              ¡Tu expediente ha sido registrado exitosamente!
            </h2>

            <p style={{ color: 'var(--ats-text-secondary)', fontSize: '0.98rem', maxWidth: 600, margin: '0 auto 28px auto', lineHeight: 1.6 }}>
              Muchas gracias por postular a la posición de <strong>{vacancy.title}</strong>. Tu perfil y CV han sido ingresados directamente en el panel de evaluación ejecutiva.
            </p>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid var(--ats-border)',
                borderRadius: 12,
                padding: '20px 24px',
                textAlign: 'left',
                maxWidth: 540,
                margin: '0 auto 32px auto'
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ats-navy)', marginBottom: 8 }}>
                Resumen de tu registro:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--ats-text-muted)' }}>Candidato:</span> <strong>{nombre}</strong></div>
                <div><span style={{ color: 'var(--ats-text-muted)' }}>Documento:</span> <strong>{dni}</strong></div>
                <div><span style={{ color: 'var(--ats-text-muted)' }}>Posición:</span> <strong>{vacancy.title}</strong></div>
                <div><span style={{ color: 'var(--ats-text-muted)' }}>CV Registrado:</span> <strong style={{ color: '#0066CC' }}>{safeCvFilename || cvFile?.name}</strong></div>
                <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
                  <span style={{ color: 'var(--ats-text-muted)' }}>Almacenamiento:</span>{' '}
                  <strong style={{ color: '#059669' }}>Google Drive Corporativo ✓</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
              <Button variant="primary" size="lg" onClick={onNavigateHome}>
                Ir al Portal Principal
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Vacancy Hero Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1B2A4A 0%, #0066CC 100%)',
                borderRadius: 16,
                padding: '36px 32px',
                color: '#FFFFFF',
                boxShadow: 'var(--ats-shadow-lg)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -40,
                  top: -40,
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0, 163, 224, 0.3) 0%, rgba(0,0,0,0) 70%)',
                  pointerEvents: 'none'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Convocatoria Oficial 2026+
                </span>
                <span
                  style={{
                    backgroundColor: 'rgba(0, 229, 255, 0.2)',
                    color: '#A5F3FC',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {vacancy.code}
                </span>
              </div>

              <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0 0 14px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {vacancy.title}
              </h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: '0.88rem', color: '#E2E8F0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={16} color="#00E5FF" />
                  <span>{vacancy.sector}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={16} color="#00E5FF" />
                  <span>{vacancy.location}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={16} color="#00E5FF" />
                  <span>{vacancy.modality} · Posición Ejecutiva</span>
                </span>
              </div>
            </div>

            {/* Closed warning banner */}
            {isClosedOrPaused && (
              <div
                style={{
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: '#92400E'
                }}
              >
                <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.875rem' }}>
                  <strong>Aviso del Comité:</strong> Esta posición se encuentra actualmente en estado{' '}
                  <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{vacancy.status}</span>. Tu postulación será resguardada en nuestro banco de reserva ejecutiva.
                </div>
              </div>
            )}

            {/* Application Form */}
            <Card padding="lg" style={{ boxShadow: 'var(--ats-shadow-md)', border: '1px solid var(--ats-border)' }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ats-navy)', margin: '0 0 4px 0' }}>
                  Formulario de Postulación de Alta Dirección
                </h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ats-text-secondary)' }}>
                  Por favor completa tu perfil directivo y adjunta tu currículum actualizado. Toda la información es tratada bajo estricto secreto profesional.
                </p>
              </div>

              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#991B1B',
                    fontSize: '0.875rem',
                    marginBottom: 20
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* 1. INFORMACIÓN PERSONAL Y DE CONTACTO */}
                <div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      color: 'var(--ats-blue)',
                      borderBottom: '2px solid #E2E8F0',
                      paddingBottom: 8,
                      marginBottom: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ backgroundColor: '#EBF4FC', color: '#0066CC', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>1</span>
                    <span>Información Personal y de Contacto</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                    <div className="ats-input-group" style={{ margin: 0 }}>
                      <label className="ats-label">
                        Nombre Completo <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="ats-input"
                        placeholder="Ej: Patricia Benavides Morales"
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
                        placeholder="Ej: 40928192"
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
                        placeholder="Ej: 45"
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
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      color: 'var(--ats-blue)',
                      borderBottom: '2px solid #E2E8F0',
                      paddingBottom: 8,
                      marginBottom: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ backgroundColor: '#EBF4FC', color: '#0066CC', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</span>
                    <span>Trayectoria Directiva y Compensación</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                    <div className="ats-input-group" style={{ margin: 0 }}>
                      <label className="ats-label">
                        Actual o Última Posición / Cargo <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="ats-input"
                        placeholder="Ej: Gerente General / CFO"
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
                        <label className="ats-label">Especifica tu Sector</label>
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
                        Salario Actual o Pretensión Mensual (S/.) <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="ats-input"
                        placeholder="Ej: 25000"
                        value={salarioActualUltimo}
                        onChange={(e) => setSalarioActualUltimo(e.target.value ? Number(e.target.value) : '')}
                        required
                      />
                    </div>

                    {/* Nivel de Inglés Avanzado */}
                    <div className="ats-input-group" style={{ margin: 0 }}>
                      <label className="ats-label">
                        ¿Cuentas con Inglés Avanzado / Profesional? <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24, height: 44, paddingLeft: 4 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: 'var(--ats-navy)', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="pageInglesAvanzado"
                            value="Sí"
                            checked={inglesAvanzado === 'Sí'}
                            onChange={() => setInglesAvanzado('Sí')}
                          />
                          <span>Sí</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: 'var(--ats-navy)', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="pageInglesAvanzado"
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
                        Tipo de Organización más reciente <span style={{ color: '#EF4444' }}>*</span>
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
                      padding: 18,
                      borderRadius: 12,
                      border: '1px solid var(--ats-border)',
                      marginTop: 18
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                        ¿Cuentas con grado de Maestría, MBA o Posgrado?
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: 'var(--ats-navy)' }}>
                          <input
                            type="radio"
                            name="hasMasterPage"
                            checked={hasMaster}
                            onChange={() => setHasMaster(true)}
                          />
                          <span>Sí</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: 'var(--ats-navy)' }}>
                          <input
                            type="radio"
                            name="hasMasterPage"
                            checked={!hasMaster}
                            onChange={() => {
                              setHasMaster(false);
                              setMasterDetails('');
                            }}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>

                    {hasMaster && (
                      <div style={{ marginTop: 14 }}>
                        <label className="ats-label" style={{ fontSize: '0.8rem' }}>
                          Especifica tu grado, especialidad e institución académica <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="ats-input"
                          placeholder="Ej: MBA en Dirección de Empresas (PAD / IESE) o Magíster en Finanzas"
                          value={masterDetails}
                          onChange={(e) => setMasterDetails(e.target.value)}
                          required={hasMaster}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. PREGUNTAS DE IDONEIDAD PARA EL PUESTO (Si aplica) */}
                {vacancy.customQuestions && vacancy.customQuestions.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        color: 'var(--ats-blue)',
                        borderBottom: '2px solid #E2E8F0',
                        paddingBottom: 8,
                        marginBottom: 18,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <span style={{ backgroundColor: '#EBF4FC', color: '#0066CC', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</span>
                      <span>Evaluación de Idoneidad para el Cargo</span>
                    </div>

                    <CustomQuestionsForm
                      questions={vacancy.customQuestions}
                      values={customAnswers}
                      onChange={handleCustomAnswerChange}
                    />
                  </div>
                )}

                {/* 4. HOJA DE VIDA / CURRÍCULUM VITAE (OBLIGATORIO) */}
                <div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      color: 'var(--ats-blue)',
                      borderBottom: '2px solid #E2E8F0',
                      paddingBottom: 8,
                      marginBottom: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ backgroundColor: '#EBF4FC', color: '#0066CC', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                      {vacancy.customQuestions && vacancy.customQuestions.length > 0 ? '4' : '3'}
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
                      borderRadius: 12,
                      padding: cvFile ? '24px' : '36px 20px',
                      textAlign: 'center',
                      backgroundColor: isDragging ? '#EFF6FF' : cvFile ? '#F0FDF4' : '#FAFAFA',
                      cursor: cvFile ? 'default' : 'pointer',
                      transition: 'all 0.25s ease',
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 10,
                              backgroundColor: '#DCFCE7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <FileText size={26} color="#15803D" />
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                              {cvFile.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Check size={14} />
                              <span>{formatFileSize(cvFile.size)} · Documento listo para adjuntar</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileInputRef.current) fileInputRef.current.click();
                            }}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid var(--ats-border)',
                              borderRadius: 8,
                              padding: '8px 14px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--ats-navy)',
                              cursor: 'pointer'
                            }}
                          >
                            Cambiar Archivo
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
                              borderRadius: 8,
                              padding: '8px 12px',
                              color: '#DC2626',
                              cursor: 'pointer'
                            }}
                            title="Eliminar archivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            backgroundColor: '#EBF4FC',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px auto'
                          }}
                        >
                          <Upload size={28} color="#0066CC" />
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ats-navy)', marginBottom: 4 }}>
                          Haz clic para seleccionar tu CV o arrástralo aquí
                        </div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.825rem', color: 'var(--ats-text-muted)' }}>
                          Admite formato PDF o Word (.docx) con verificación binaria de Magic Bytes · Tamaño máximo: 5 MB
                        </p>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.75rem',
                            color: '#0066CC',
                            backgroundColor: '#FFFFFF',
                            padding: '4px 12px',
                            borderRadius: 20,
                            border: '1px solid #BFDBFE',
                            fontWeight: 600
                          }}
                        >
                          <Lock size={12} />
                          Documento encriptado y estrictamente confidencial
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confidentiality Seal */}
                  <div
                    style={{
                      marginTop: 16,
                      backgroundColor: '#F1F5F9',
                      borderRadius: 10,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.8rem',
                      color: 'var(--ats-text-secondary)'
                    }}
                  >
                    <ShieldCheck size={18} color="#0066CC" style={{ flexShrink: 0 }} />
                    <span>
                      Tu postulación y CV están resguardados bajo los estándares éticos internacionales de la Association of Executive Search and Leadership Consultants (AESC).
                    </span>
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
                    borderRadius: 10,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12
                  }}
                >
                  <input
                    type="checkbox"
                    id="pagePrivacyConsent"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--ats-blue)', cursor: 'pointer' }}
                    required
                  />
                  <label
                    htmlFor="pagePrivacyConsent"
                    style={{
                      fontSize: '0.84rem',
                      lineHeight: 1.5,
                      color: 'var(--ats-navy)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Autorizo el tratamiento de mis datos personales y CV para procesos de selección ejecutiva actuales y futuros, conforme a la Ley de Protección de Datos Personales. <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                </div>

                {/* Submit Action */}
                <div style={{ borderTop: '1px solid var(--ats-border)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 14 }}>
                  <Button variant="outline" size="lg" onClick={onNavigateHome} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<Send size={18} />}
                    type="submit"
                    isLoading={isSubmitting}
                  >
                    Enviar Postulación Confidencial
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
