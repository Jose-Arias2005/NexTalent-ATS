import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Vacancy2026, ModalityType, VacancyStatus, CustomQuestion, CustomQuestionType } from '../../types';
import { storage } from '../../lib/storage';
import { safeExternalUrl, sanitizeInputText } from '../../lib/security';
import { buildVacancyHeaders, createGoogleSheetForVacancy } from '../../lib/driveUpload';
import { verifyBiginSubPipelineExists, checkBiginConnection } from '../../lib/biginService';
import {
  Plus,
  Trash2,
  Folder,
  Sparkles,
  X,
  Check,
  CheckSquare,
  List,
  MessageSquare,
  Copy,
  Layers,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

interface CreateVacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateVacancyModal: React.FC<CreateVacancyModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [code, setCode] = useState(`ATS-2026-${Math.floor(Math.random() * 90 + 10)}`);
  const [title, setTitle] = useState('');
  const [sector, setSector] = useState('Minería y Metales');
  const [location, setLocation] = useState('Lima, Perú');
  const [modality, setModality] = useState<ModalityType>('Híbrido');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [status, setStatus] = useState<VacancyStatus>('active');
  const [description, setDescription] = useState('');
  const [requirementsText, setRequirementsText] = useState('');

  // Destino de Almacenamiento: Carpeta del Job y Carpeta de CVs en Drive
  const [folderName, setFolderName] = useState('');
  const [jobFolderUrl, setJobFolderUrl] = useState('');
  const [cvsFolderUrl, setCvsFolderUrl] = useState('');

  // Estado de sincronización y creación de Google Sheet
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStepText, setSubmitStepText] = useState('');

  // Preguntas dinámicas del puesto
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<CustomQuestionType>('text');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionSpecifyPlaceholder, setNewQuestionSpecifyPlaceholder] = useState('');
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [optionInputText, setOptionInputText] = useState('');
  const [questionError, setQuestionError] = useState('');

  // Bigin Sub-Pipeline Verification State
  const [isBiginVerified, setIsBiginVerified] = useState(false);
  const [isVerifyingBigin, setIsVerifyingBigin] = useState(false);
  const [biginCheckMessage, setBiginCheckMessage] = useState<{
    type: 'success' | 'error' | 'idle';
    text: string;
  }>({ type: 'idle', text: '' });
  const [availableBiginSubPipelines, setAvailableBiginSubPipelines] = useState<string[]>([]);
  const [copiedBiginTitle, setCopiedBiginTitle] = useState(false);
  const [biginPipelineName, setBiginPipelineName] = useState('Jobs');

  useEffect(() => {
    if (isOpen) {
      checkBiginConnection().then((st) => {
        if (st.selectedPipeline?.name) {
          setBiginPipelineName(st.selectedPipeline.name);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  // Autocompletar nombre de carpeta según el título
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setIsBiginVerified(false);
    setBiginCheckMessage({ type: 'idle', text: '' });
    const clean = val
      .trim()
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/g, '_')
      .replace(/^_+|_+$/g, '');
    setFolderName(`2026_${clean}`);
  };

  const handleCopyAndOpenBigin = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      alert('Por favor ingresa primero el título del puesto arriba.');
      return;
    }
    navigator.clipboard.writeText(cleanTitle);
    setCopiedBiginTitle(true);
    setTimeout(() => setCopiedBiginTitle(false), 3000);
    window.open('https://bigin.zoho.com/', '_blank');
  };

  const handleVerifyBigin = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setBiginCheckMessage({
        type: 'error',
        text: 'Por favor ingresa un título de puesto antes de verificar.'
      });
      return;
    }

    setIsVerifyingBigin(true);
    setBiginCheckMessage({ type: 'idle', text: '' });

    try {
      const res = await verifyBiginSubPipelineExists(cleanTitle);
      setAvailableBiginSubPipelines(res.availableSubPipelines || []);

      if (res.exists) {
        setIsBiginVerified(true);
        if (res.pipelineName) setBiginPipelineName(res.pipelineName);
        setBiginCheckMessage({
          type: 'success',
          text: `✓ Sub-Pipeline "${res.matchedName || cleanTitle}" verificado exitosamente en Bigin (${res.pipelineName || biginPipelineName}).`
        });
      } else {
        setIsBiginVerified(false);
        setBiginCheckMessage({
          type: 'error',
          text: `❌ Aún no existe la hoja "${cleanTitle}" en Bigin (${biginPipelineName}). Usa el botón "Copiar Nombre e Ir a Bigin ↗", créala con el botón (+) y vuelve a verificar.`
        });
      }
    } catch (err: any) {
      setIsBiginVerified(false);
      setBiginCheckMessage({
        type: 'error',
        text: `Error al conectar con Bigin: ${err?.message || err}`
      });
    } finally {
      setIsVerifyingBigin(false);
    }
  };

  const handleSelectExistingBiginSubPipeline = (name: string) => {
    setTitle(name);
    setIsBiginVerified(true);
    setBiginCheckMessage({
      type: 'success',
      text: `✓ Sub-Pipeline "${name}" seleccionado y verificado en Bigin (${biginPipelineName}).`
    });
    const clean = name
      .trim()
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/g, '_')
      .replace(/^_+|_+$/g, '');
    setFolderName(`2026_${clean}`);
  };

  // Agregar opción dinámica para Selección Única o Selección Múltiple
  const handleAddOption = () => {
    const raw = optionInputText.trim();
    if (!raw) return;

    // Si el usuario pega texto con comas, separamos automáticamente
    const parts = raw.includes(',')
      ? raw.split(',').map((p) => p.trim()).filter(Boolean)
      : [raw];

    const updated = [...currentOptions];
    parts.forEach((p) => {
      if (!updated.some((opt) => opt.toLowerCase() === p.toLowerCase())) {
        updated.push(p);
      }
    });

    setCurrentOptions(updated);
    setOptionInputText('');
    setQuestionError('');
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setCurrentOptions(currentOptions.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddQuestion = () => {
    setQuestionError('');
    if (!newQuestionLabel.trim()) {
      setQuestionError('Por favor ingresa el nombre o enunciado de la pregunta.');
      return;
    }

    let finalOptions: string[] | undefined = undefined;

    if (newQuestionType === 'select' || newQuestionType === 'multiselect') {
      let opts = [...currentOptions];

      // Si el reclutador dejó escrito algo en el input de opciones, incorporarlo automáticamente
      if (optionInputText.trim()) {
        const raw = optionInputText.trim();
        const parts = raw.includes(',')
          ? raw.split(',').map((p) => p.trim()).filter(Boolean)
          : [raw];
        parts.forEach((p) => {
          if (!opts.some((opt) => opt.toLowerCase() === p.toLowerCase())) {
            opts.push(p);
          }
        });
      }

      if (opts.length < 2) {
        setQuestionError('Debes agregar al menos 2 opciones para preguntas de selección.');
        return;
      }
      finalOptions = opts;
    }

    const newQ: CustomQuestion = {
      id: `cq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      options: finalOptions,
      required: newQuestionRequired,
      specifyPlaceholder:
        newQuestionType === 'boolean_with_details'
          ? newQuestionSpecifyPlaceholder.trim() || 'Especifica más detalles...'
          : undefined
    };

    setCustomQuestions([...customQuestions, newQ]);
    setNewQuestionLabel('');
    setNewQuestionType('text');
    setNewQuestionRequired(false);
    setNewQuestionSpecifyPlaceholder('');
    setCurrentOptions([]);
    setOptionInputText('');
    setQuestionError('');
  };

  const handleRemoveQuestion = (id: string) => {
    setCustomQuestions(customQuestions.filter((q) => q.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Si el usuario dejó una pregunta en proceso en el formulario, intentar incluirla automáticamente
    let finalQuestions = [...customQuestions];
    if (newQuestionLabel.trim()) {
      if (newQuestionType === 'select' || newQuestionType === 'multiselect') {
        let opts = [...currentOptions];
        if (optionInputText.trim()) {
          const parts = optionInputText.trim().split(',').map((p) => p.trim()).filter(Boolean);
          parts.forEach((p) => {
            if (!opts.includes(p)) opts.push(p);
          });
        }
        if (opts.length >= 2) {
          finalQuestions.push({
            id: `cq-${Date.now()}`,
            label: newQuestionLabel.trim(),
            type: newQuestionType,
            options: opts,
            required: newQuestionRequired
          });
        }
      } else {
        finalQuestions.push({
          id: `cq-${Date.now()}`,
          label: newQuestionLabel.trim(),
          type: newQuestionType,
          required: newQuestionRequired,
          specifyPlaceholder:
            newQuestionType === 'boolean_with_details'
              ? newQuestionSpecifyPlaceholder.trim() || 'Especifica más detalles...'
              : undefined
        });
      }
    }

    const requirements = requirementsText
      .split('\n')
      .map((r) => sanitizeInputText(r.trim()))
      .filter((r) => r.length > 0);

    const safeJobUrl = jobFolderUrl.trim() ? safeExternalUrl(jobFolderUrl.trim()) : undefined;
    const safeCvsUrl = cvsFolderUrl.trim() ? safeExternalUrl(cvsFolderUrl.trim()) : undefined;

    const sanitizedQuestions = finalQuestions.map((q) => ({
      ...q,
      label: sanitizeInputText(q.label),
      options: q.options ? q.options.map((opt) => sanitizeInputText(opt)) : undefined,
      specifyPlaceholder: q.specifyPlaceholder ? sanitizeInputText(q.specifyPlaceholder) : undefined
    }));

    // REGLA ESTRICTA: Verificación obligatoria de existencia del Sub-Pipeline en Bigin CRM
    let verified = isBiginVerified;
    let matchedBiginName = title.trim();

    if (!verified) {
      setIsSubmitting(true);
      setSubmitStepText('Verificando existencia obligatoria de la hoja en Bigin CRM...');
      try {
        const verifyRes = await verifyBiginSubPipelineExists(title.trim());
        setAvailableBiginSubPipelines(verifyRes.availableSubPipelines || []);

        if (verifyRes.exists) {
          verified = true;
          setIsBiginVerified(true);
          matchedBiginName = verifyRes.matchedName || title.trim();
          setBiginCheckMessage({
            type: 'success',
            text: `✓ Sub-Pipeline "${matchedBiginName}" verificado exitosamente en Bigin (${biginPipelineName}).`
          });
        } else {
          setIsSubmitting(false);
          setSubmitStepText('');
          setIsBiginVerified(false);
          setBiginCheckMessage({
            type: 'error',
            text: `❌ Creación Bloqueada: Aún no existe la hoja "${title.trim()}" en Bigin (${biginPipelineName}). Usa el botón "Copiar Nombre e Ir a Bigin ↗", créala con el botón (+) y vuelve a verificar.`
          });
          alert(
            `⚠️ Creación Bloqueada por Validación de Bigin:\n\nNo se encontró ninguna pestaña llamada "${title.trim()}" en el pipeline "${biginPipelineName}" de Bigin CRM.\n\nPor favor haz clic en "📋 Copiar Nombre e Ir a Bigin ↗" para crearla con el botón (+) antes de registrar el puesto.`
          );
          return; // BLOQUEO ESTRICTO: NO crea en Drive, NO guarda en IndexedDB
        }
      } catch (checkErr: any) {
        setIsSubmitting(false);
        setSubmitStepText('');
        setBiginCheckMessage({
          type: 'error',
          text: `Error al conectar con Bigin: ${checkErr?.message || checkErr}`
        });
        alert(`Error al verificar Bigin: ${checkErr?.message || checkErr}`);
        return; // BLOQUEADO
      }
    }

    setIsSubmitting(true);
    setSubmitStepText('Creando Google Sheet oficial en Google Drive...');

    // 1. Encabezados exactos: 12 columnas base + preguntas personalizadas + Link del CV
    const headers = buildVacancyHeaders(sanitizedQuestions);

    // 2. Creación automática del Sheet en Drive con el nombre del puesto
    let sheetFileId: string | undefined = undefined;
    let sheetUrl: string | undefined = undefined;

    try {
      const sheetRes = await createGoogleSheetForVacancy({
        vacancyTitle: sanitizeInputText(title.trim()),
        jobFolderUrl: safeJobUrl === '#' ? undefined : safeJobUrl,
        headers
      });

      if (sheetRes.success && sheetRes.fileId) {
        sheetFileId = sheetRes.fileId;
        sheetUrl = sheetRes.webViewLink;
      }
    } catch (sheetErr) {
      console.warn('[Auto-create Google Sheet Warning]:', sheetErr);
    }

    setSubmitStepText('Guardando vacante en la base de datos...');

    const newVacancy: Vacancy2026 = {
      id: `vac-${Date.now()}`,
      code: code.trim(),
      title: sanitizeInputText(title.trim()),
      sector,
      location: sanitizeInputText(location.trim()),
      modality,
      salaryBudgetMin: salaryMin ? Number(salaryMin) : undefined,
      salaryBudgetMax: salaryMax ? Number(salaryMax) : undefined,
      status,
      description: sanitizeInputText(description.trim()),
      requirements: requirements.length > 0 ? requirements : ['Experiencia directiva en el sector.'],
      folderName: sanitizeInputText(folderName.trim()) || `2026_${title.trim().replace(/\s+/g, '_')}`,
      jobFolderUrl: safeJobUrl === '#' ? undefined : safeJobUrl,
      cvsFolderUrl: safeCvsUrl === '#' ? undefined : safeCvsUrl,
      driveFolderUrl: safeCvsUrl === '#' ? undefined : safeCvsUrl,
      googleSheetFileId: sheetFileId,
      googleSheetUrl: sheetUrl,
      biginSubPipelineName: matchedBiginName || sanitizeInputText(title.trim()),
      isImportedHistorical: false,
      customQuestions: sanitizedQuestions,
      createdAt: new Date().toISOString()
    };

    try {
      await storage.saveVacancy2026(newVacancy);
      if (onSuccess) onSuccess();
      onClose();
    } catch (saveErr: any) {
      alert('Error guardando la vacante: ' + (saveErr?.message || saveErr));
    } finally {
      setIsSubmitting(false);
      setSubmitStepText('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Vacante (Formato 2026)"
      subtitle="Configura el puesto, asigna la carpeta de almacenamiento de CVs y agrega preguntas personalizadas"
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Core Vacancy Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Código Vacante</label>
            <input
              type="text"
              className="ats-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Título del Cargo Ejecutivo</label>
            <input
              type="text"
              className="ats-input"
              placeholder="Ej: Gerente de Operaciones Mineras"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Tarjeta Ejecutiva Corporativa: Vinculación Obligatoria con Bigin CRM (Pipeline: Jobs) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: isBiginVerified ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>💼</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0A1120', letterSpacing: '-0.01em' }}>
                Vinculación Obligatoria con Bigin CRM (Pipeline: {biginPipelineName})
              </span>
            </div>
            {isBiginVerified ? (
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  letterSpacing: '0.02em'
                }}
              >
                <span>✓</span>
                <span>SUB-PIPELINE &quot;{title.trim()}&quot; VERIFICADO</span>
              </span>
            ) : (
              <span
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#B45309',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.02em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span>⚠️</span>
                <span>VERIFICACIÓN OBLIGATORIA PENDIENTE</span>
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
            Para que los candidatos ingresen automáticamente a su columna correspondiente en Bigin, la hoja debe existir con el nombre exacto:{' '}
            <strong
              style={{
                color: '#0052CC',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 4
              }}
            >
              {title.trim() || '(Ingresa el título del puesto arriba)'}
            </strong>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleCopyAndOpenBigin}
              disabled={!title.trim()}
              style={{
                backgroundColor: copiedBiginTitle ? '#059669' : '#0A1120',
                border: copiedBiginTitle ? '1px solid #059669' : '1px solid #0A1120',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: title.trim() ? 'pointer' : 'not-allowed',
                opacity: title.trim() ? 1 : 0.5,
                transition: 'background-color 0.15s ease'
              }}
              title={`Copia el título exacto al portapapeles y abre la vista de Bigin (${biginPipelineName})`}
            >
              {copiedBiginTitle ? (
                <span>✓ ¡Nombre copiado! Pégalo en el botón (+) de Bigin</span>
              ) : (
                <span>📋 Copiar Nombre e Ir a Bigin ({biginPipelineName}) ↗</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleVerifyBigin}
              disabled={isVerifyingBigin || !title.trim()}
              style={{
                backgroundColor: isBiginVerified ? '#EFF6FF' : '#0052CC',
                border: isBiginVerified ? '1px solid #BFDBFE' : '1px solid #0052CC',
                color: isBiginVerified ? '#1D4ED8' : '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: isVerifyingBigin || !title.trim() ? 'not-allowed' : 'pointer',
                opacity: isVerifyingBigin || !title.trim() ? 0.5 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              {isVerifyingBigin ? (
                <>
                  <span
                    role="status"
                    aria-hidden="true"
                    style={{
                      width: 12,
                      height: 12,
                      border: '2px solid currentColor',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 1s linear infinite'
                    }}
                  ></span>
                  <span>Verificando en Bigin...</span>
                </>
              ) : (
                <span>🔄 Verificar si ya existe en Bigin</span>
              )}
            </button>
          </div>

          {/* Mensajes de Alerta y Estado */}
          {biginCheckMessage.text && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.45,
                backgroundColor: biginCheckMessage.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                border:
                  biginCheckMessage.type === 'success' ? '1px solid #BBF7D0' : '1px solid #FECACA',
                color: biginCheckMessage.type === 'success' ? '#15803D' : '#B91C1C',
                fontWeight: 500
              }}
            >
              {biginCheckMessage.text}
            </div>
          )}

          {/* Opciones activas detectadas en Bigin si existen */}
          {availableBiginSubPipelines.length > 0 && (
            <div style={{ marginTop: 2 }}>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6, fontWeight: 600 }}>
                Hojas detectadas actualmente en Bigin {biginPipelineName} (haz clic para adoptar una existente):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableBiginSubPipelines.map((sub) => {
                  const isCurrent = sub.trim().toLowerCase() === title.trim().toLowerCase();
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleSelectExistingBiginSubPipeline(sub)}
                      style={{
                        backgroundColor: isCurrent ? '#EFF6FF' : '#F8FAFC',
                        border: isCurrent ? '1px solid #3B82F6' : '1px solid #CBD5E1',
                        color: isCurrent ? '#1D4ED8' : '#0A1120',
                        borderRadius: 5,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title={`Adoptar "${sub}" como título de la vacante`}
                    >
                      {isCurrent && <span>✓</span>}
                      <span>{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
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
              <option value="Industrial y Manufactura">Industrial y Manufactura</option>
              <option value="Tecnología & Software">Tecnología & Software</option>
              <option value="Agroindustria">Agroindustria</option>
              <option value="Energía & Oil/Gas">Energía & Oil/Gas</option>
              <option value="Servicios Profesionales">Servicios Profesionales</option>
              <option value="Salud y Farmacéutica">Salud y Farmacéutica</option>
              <option value="Logística & Supply Chain">Logística & Supply Chain</option>
              <option value="Construcción & Real Estate">Construcción & Real Estate</option>
            </select>
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Modalidad</label>
            <select
              className="ats-select"
              value={modality}
              onChange={(e) => setModality(e.target.value as ModalityType)}
            >
              <option value="Presencial">Presencial</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Remoto">Remoto</option>
            </select>
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Ubicación</label>
            <input
              type="text"
              className="ats-input"
              placeholder="Ej: Lima, Perú"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Estado Inicial</label>
            <select
              className="ats-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as VacancyStatus)}
            >
              <option value="active">Activo (Visible en Web)</option>
              <option value="paused">Pausado</option>
              <option value="closed">Cerrado / Histórico 2026</option>
            </select>
          </div>
        </div>

        {/* SECCIÓN CARPETAS GOOGLE DRIVE: JOB Y CVS */}
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
            <strong style={{ fontSize: '0.9rem', color: 'var(--ats-navy)' }}>
              Carpetas de Google Drive Asociadas al Proceso
            </strong>
            <Badge variant="cyan">Acceso Directo</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="ats-input-group" style={{ margin: 0 }}>
              <label className="ats-label">
                1. Carpeta / Perfil del Job (Drive)
              </label>
              <input
                type="url"
                className="ats-input"
                placeholder="https://drive.google.com/drive/folders/..."
                value={jobFolderUrl}
                onChange={(e) => setJobFolderUrl(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 4 }}>
                Enlace a la carpeta o archivo donde está el perfil y requisitos del puesto.
              </span>
            </div>

            <div className="ats-input-group" style={{ margin: 0 }}>
              <label className="ats-label">
                2. Carpeta de los CVs (Drive)
              </label>
              <input
                type="url"
                className="ats-input"
                placeholder="https://drive.google.com/drive/folders/..."
                value={cvsFolderUrl}
                onChange={(e) => setCvsFolderUrl(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 4 }}>
                Enlace a la carpeta compartida donde se reciben y almacenan los CVs.
              </span>
            </div>
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">
              Nombre de la Carpeta del Puesto <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              className="ats-input"
              placeholder="2026_Gerente_Comercial"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 4 }}>
              Identificador organizativo para los expedientes de este proceso.
            </span>
          </div>
        </div>

        {/* Salary Budget */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Presupuesto Salarial Mínimo (S/.)</label>
            <input
              type="number"
              className="ats-input"
              placeholder="Ej: 25000"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          <div className="ats-input-group" style={{ margin: 0 }}>
            <label className="ats-label">Presupuesto Salarial Máximo (S/.)</label>
            <input
              type="number"
              className="ats-input"
              placeholder="Ej: 35000"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
        </div>

        {/* Description & Requirements */}
        <div className="ats-input-group" style={{ margin: 0 }}>
          <label className="ats-label">Descripción Ejecutiva del Puesto</label>
          <textarea
            className="ats-textarea"
            rows={3}
            placeholder="Alcance del rol, reporte directo, equipo a cargo y desafíos del puesto..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="ats-input-group" style={{ margin: 0 }}>
          <label className="ats-label">Requisitos Clave (Uno por línea)</label>
          <textarea
            className="ats-textarea"
            rows={2}
            placeholder="- Título universitario y maestría relevante&#10;- Mínimo 10 años en puestos directivos"
            value={requirementsText}
            onChange={(e) => setRequirementsText(e.target.value)}
          />
        </div>

        {/* Dynamic Questions Builder */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 12,
            padding: 18,
            border: '1px solid var(--ats-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ats-navy)', display: 'block' }}>
                Preguntas Personalizadas de Idoneidad (Según Cargo)
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--ats-text-muted)' }}>
                Configura preguntas a la medida del perfil (texto, selección única, casillas múltiples o Sí/No condicional).
              </span>
            </div>
            <Badge variant="navy">{customQuestions.length} añadidas</Badge>
          </div>

          {/* Lista de preguntas ya agregadas */}
          {customQuestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {customQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--ats-border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: 'var(--ats-blue)', fontSize: '0.85rem' }}>
                          M{idx + 1}:
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ats-navy)' }}>
                          {q.label}
                        </span>
                        {q.required && (
                          <span style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 700 }}>
                            (Obligatoria *)
                          </span>
                        )}
                        {q.type === 'text' && <Badge variant="navy">Texto Libre</Badge>}
                        {q.type === 'select' && (
                          <Badge variant="cyan">Selección Única ({q.options?.length || 0})</Badge>
                        )}
                        {q.type === 'multiselect' && (
                          <Badge variant="success">Selección Múltiple ({q.options?.length || 0})</Badge>
                        )}
                        {q.type === 'boolean' && <Badge variant="navy">Sí / No</Badge>}
                        {q.type === 'boolean_with_details' && (
                          <Badge variant="warning">Sí/No + Detalle</Badge>
                        )}
                      </div>

                      {/* Vista previa de opciones para select y multiselect */}
                      {(q.type === 'select' || q.type === 'multiselect') && q.options && q.options.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {q.options.map((opt, optIdx) => (
                            <span
                              key={optIdx}
                              style={{
                                fontSize: '0.74rem',
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                padding: '2px 8px',
                                borderRadius: 10,
                                border: '1px solid #E2E8F0'
                              }}
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Vista previa de mensaje condicional */}
                      {q.type === 'boolean_with_details' && (
                        <div style={{ fontSize: '0.76rem', color: '#B45309', marginTop: 2 }}>
                          ↳ Al responder &quot;Sí&quot; se abre: &quot;{q.specifyPlaceholder || 'Especifica más detalles...'}&quot;
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      title="Eliminar pregunta"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: 4,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Creador interactivo de nueva pregunta */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: 16,
              borderRadius: 10,
              border: '1.5px dashed #CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr', gap: 12 }}>
              <div>
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--ats-navy)',
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  Enunciado o Nombre de la Pregunta
                </label>
                <input
                  type="text"
                  className="ats-input"
                  style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                  placeholder="Ej: ¿Tienes disponibilidad para régimen minero 14x7?"
                  value={newQuestionLabel}
                  onChange={(e) => {
                    setNewQuestionLabel(e.target.value);
                    if (questionError) setQuestionError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuestion();
                    }
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--ats-navy)',
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  Tipo de Respuesta
                </label>
                <select
                  className="ats-select"
                  style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                  value={newQuestionType}
                  onChange={(e) => {
                    setNewQuestionType(e.target.value as CustomQuestionType);
                    if (questionError) setQuestionError('');
                  }}
                >
                  <option value="text">Texto Libre (Respuesta abierta)</option>
                  <option value="select">Selección Única (Menú desplegable)</option>
                  <option value="multiselect">Selección Múltiple (Checkboxes / Casillas)</option>
                  <option value="boolean_with_details">
                    Sí / No + Especificar si es Sí (como Maestría)
                  </option>
                  <option value="boolean">Sí / No (Simple)</option>
                </select>
              </div>
            </div>

            {/* Panel de Opciones Dinámicas para Selección Única o Selección Múltiple */}
            {(newQuestionType === 'select' || newQuestionType === 'multiselect') && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #E2E8F0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--ats-navy)',
                      display: 'block'
                    }}
                  >
                    Opciones Disponibles para el Postulante
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ats-text-muted)' }}>
                    {currentOptions.length} opciones configuradas
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="ats-input"
                    style={{ fontSize: '0.85rem', padding: '6px 10px', flex: 1 }}
                    placeholder="Escribe una opción y presiona Enter o clic en Añadir..."
                    value={optionInputText}
                    onChange={(e) => setOptionInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={handleAddOption}
                  >
                    + Opción
                  </Button>
                </div>

                {/* Chips de opciones agregadas */}
                {currentOptions.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {currentOptions.map((opt, optIdx) => (
                      <span
                        key={optIdx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: '#EFF6FF',
                          color: '#0066CC',
                          border: '1px solid #BFDBFE',
                          padding: '4px 10px',
                          borderRadius: 16,
                          fontSize: '0.82rem',
                          fontWeight: 600
                        }}
                      >
                        <span>{opt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(optIdx)}
                          title="Eliminar opción"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#93C5FD',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#93C5FD')}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 6 }}>
                    Tip: Puedes escribir una por una o pegar una lista separada por comas (ej: Presencial, Híbrido, Remoto).
                  </div>
                )}
              </div>
            )}

            {/* Panel de Especificación para Sí/No Condicional */}
            {newQuestionType === 'boolean_with_details' && (
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #FDE68A'
                }}
              >
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#92400E',
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  Texto de la caja que se abrirá si responde &quot;Sí&quot; (como en Maestría):
                </label>
                <input
                  type="text"
                  className="ats-input"
                  style={{ fontSize: '0.85rem', padding: '6px 10px', backgroundColor: '#FFFFFF' }}
                  placeholder="Ej: ¿Cuáles son las maestrías o certificaciones que posees?"
                  value={newQuestionSpecifyPlaceholder}
                  onChange={(e) => setNewQuestionSpecifyPlaceholder(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: '#B45309', marginTop: 4, display: 'block' }}>
                  Si el postulante marca &quot;Sí&quot;, se desplegará una caja solicitando este detalle. Si marca &quot;No&quot;, no se solicitará nada.
                </span>
              </div>
            )}

            {/* Fila inferior: Obligatoriedad y Botón Agregar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 6
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--ats-navy)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={newQuestionRequired}
                  onChange={(e) => setNewQuestionRequired(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--ats-blue)' }}
                />
                <span>Pregunta obligatoria para el postulante (*)</span>
              </label>

              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={handleAddQuestion}
              >
                Añadir Pregunta
              </Button>
            </div>

            {/* Mensaje de error si falta algo */}
            {questionError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '0.78rem',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontWeight: 600
                }}
              >
                {questionError}
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
          {isSubmitting && (
            <span style={{ fontSize: '0.825rem', color: '#0066CC', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid #BFDBFE',
                  borderTopColor: '#0066CC',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <span>{submitStepText || 'Procesando...'}</span>
            </span>
          )}
          <Button variant="outline" size="md" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando Vacante y Sheet...' : 'Guardar Vacante'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
