import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import {
  checkBiginConnection,
  getBiginConfig,
  saveBiginConfig,
  exchangeBiginCode,
  fetchBiginLogs,
  clearBiginLogs,
  fetchActiveBiginSubPipelines,
  uploadSelfClient,
  selectBiginPipeline,
  disconnectBigin,
  BiginStatusResponse,
  BiginLogEntry
} from '../lib/biginService';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Database,
  ArrowRight,
  Terminal,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  UploadCloud,
  SlidersHorizontal,
  FileText
} from 'lucide-react';

interface BiginConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'config' | 'logs' | 'subpipelines';
}

export const BiginConnectionModal: React.FC<BiginConnectionModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'config'
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'subpipelines'>(defaultTab);
  const [status, setStatus] = useState<BiginStatusResponse | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [grantCode, setGrantCode] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Live Logs State
  const [logs, setLogs] = useState<BiginLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Active Sub-Pipelines State
  const [activeSubPipelines, setActiveSubPipelines] = useState<string[]>([]);
  const [isLoadingSubPipelines, setIsLoadingSubPipelines] = useState(false);

  // Self Client & Pipeline Selector State
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploadingJson, setIsUploadingJson] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isSelectingPipeline, setIsSelectingPipeline] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        '¿Estás seguro de que deseas quitar las credenciales de Zoho Bigin?\n\nSe eliminarán los tokens guardados (bigin_token.json y self_client.json) para que puedas volver a colocar otras credenciales o cargar un nuevo archivo.'
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    setFeedback(null);
    try {
      const res = await disconnectBigin();
      if (res.success) {
        setClientId('');
        setClientSecret('');
        setGrantCode('');
        setRefreshToken('');
        setActiveSubPipelines([]);
        setStatus({ connected: false });
        setFeedback({
          type: 'info',
          message: '✓ Credenciales eliminadas con éxito. Ahora puedes colocar o subir nuevas credenciales.'
        });
        await loadLogs(false);
      } else {
        setFeedback({
          type: 'error',
          message: `Error al eliminar credenciales: ${res.error}`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error de red: ${err?.message || err}`
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSelfClientFile = async (file: File) => {
    setIsUploadingJson(true);
    setFeedback(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const cId = json.client_id || json.clientId || json.client_ID || '';
      const cSec = json.client_secret || json.clientSecret || json.client_SECRET || '';
      const gCode = json.grant_token || json.code || json.grantCode || json.authorization_code || '';

      if (cId) setClientId(cId);
      if (cSec) setClientSecret(cSec);
      if (gCode) setGrantCode(gCode);

      const res = await uploadSelfClient(json);
      if (res.success) {
        if (res.autoConnected) {
          setRefreshToken('●●●●●●●● (Token Permanente Activo)');
          setFeedback({
            type: 'success',
            message: res.message || '¡Archivo self_client.json cargado y token generado con éxito!'
          });
          await handleTestConnection();
        } else {
          setFeedback({
            type: 'info',
            message: `${res.message || 'Archivo self_client.json cargado.'} Ahora ingresa el Grant Code de Zoho Console y presiona "Canjear y Conectar".`
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Error al procesar self_client.json'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al leer el archivo JSON: ${err?.message || err}`
      });
    } finally {
      setIsUploadingJson(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePipelineChange = async (pipelineId: string) => {
    const chosen = status?.layouts?.find((l) => l.id === pipelineId);
    if (!chosen) return;
    setIsSelectingPipeline(true);
    try {
      const res = await selectBiginPipeline(chosen.id, chosen.name);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Pipeline activo cambiado a "${chosen.name}". Etapas y hojas actualizadas.`
        });
        await handleTestConnection();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error cambiando pipeline: ${err?.message || err}`
      });
    } finally {
      setIsSelectingPipeline(false);
    }
  };

  // Load status and configuration on open
  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    if (defaultTab) setActiveTab(defaultTab);

    // Fetch credentials & connection test
    getBiginConfig().then((cfg) => {
      if (cfg) {
        if (cfg.clientId) setClientId(cfg.clientId);
        if (cfg.hasRefreshToken) setRefreshToken('●●●●●●●● (Token Permanente Activo)');
      }
    });

    handleTestConnection();
    loadLogs();
    loadSubPipelines();
  }, [isOpen]);

  // Polling logs every 4 seconds when logs tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'logs') return;
    const interval = setInterval(() => {
      loadLogs(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  const loadLogs = async (showLoading = true) => {
    if (showLoading) setIsLoadingLogs(true);
    try {
      const entries = await fetchBiginLogs();
      setLogs(entries);
    } catch {
      // Ignore
    } finally {
      if (showLoading) setIsLoadingLogs(false);
    }
  };

  const loadSubPipelines = async () => {
    setIsLoadingSubPipelines(true);
    try {
      const list = await fetchActiveBiginSubPipelines();
      setActiveSubPipelines(list);
    } catch {
      setActiveSubPipelines(['General 2026', 'Posición Demo']);
    } finally {
      setIsLoadingSubPipelines(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await checkBiginConnection();
      setStatus(res);
      if (res.connected) {
        setFeedback({
          type: 'success',
          message: `Conexión verificada con Zoho Bigin CRM${res.orgId ? ` (Organización ID: ${res.orgId})` : ''}. Las vacantes y postulantes se sincronizan en tiempo real.`
        });
      } else {
        setFeedback({
          type: 'error',
          message: `No se pudo conectar con Zoho Bigin: ${res.error || 'Credenciales o token inválido'}`
        });
      }
      await loadLogs(false);
      await loadSubPipelines();
    } catch (err: any) {
      setStatus({ connected: false, error: err.message });
      setFeedback({
        type: 'error',
        message: `Fallo de red al probar conexión: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleExchangeGrantCode = async () => {
    if (!grantCode.trim()) {
      setFeedback({ type: 'error', message: 'Ingresa un Authorization Code (Grant Code) válido de Zoho Self Client.' });
      return;
    }

    setIsExchanging(true);
    setFeedback(null);

    try {
      const res = await exchangeBiginCode(grantCode.trim(), clientId.trim(), clientSecret.trim());
      if (res.success && res.refreshToken) {
        setRefreshToken('●●●●●●●● (Token Permanente Activo)');
        setGrantCode('');
        setFeedback({
          type: 'success',
          message: '¡Código canjeado con éxito! Refresh Token permanente generado y guardado de forma segura.'
        });
        await handleTestConnection();
      } else {
        setFeedback({
          type: 'error',
          message: `Error al canjear código con Zoho: ${res.error || 'Código expirado o inválido'}`
        });
      }
      await loadLogs(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Fallo al canjear código: ${err.message}` });
    } finally {
      setIsExchanging(false);
    }
  };

  const handleSaveCredentials = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      const ok = await saveBiginConfig({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        refreshToken: refreshToken.includes('●') ? undefined : refreshToken.trim()
      });

      if (ok) {
        setFeedback({
          type: 'success',
          message: 'Credenciales guardadas correctamente en el servidor.'
        });
        await handleTestConnection();
      } else {
        setFeedback({ type: 'error', message: 'No se pudieron guardar las credenciales en el servidor.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Error guardando credenciales: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('¿Deseas limpiar el historial de logs de Bigin?')) {
      await clearBiginLogs();
      setLogs([]);
    }
  };

  const handleCopyLog = (log: BiginLogEntry) => {
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedLogId(log.id);
    setTimeout(() => {
      setCopiedLogId((curr) => (curr === log.id ? null : curr));
    }, 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conexión Zoho Bigin CRM"
      subtitle="Sincronización nativa de Vacantes (Sub-Pipelines), Candidatos directos a 'Preseleccionados' y Registro de Logs"
      maxWidth="840px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Status Indicator Card */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 10,
            border: status?.connected ? '1px solid #10B981' : '1px solid #F59E0B',
            backgroundColor: status?.connected ? '#ECFDF5' : '#FFFBEB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: status?.connected ? '#D1FAE5' : '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {status?.connected ? (
                <CheckCircle2 size={20} color="#059669" />
              ) : (
                <AlertCircle size={20} color="#D97706" />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: status?.connected ? '#065F46' : '#92400E'
                  }}
                >
                  {status?.connected
                    ? 'Zoho Bigin CRM Conectado y Operativo'
                    : 'Conexión con Zoho Bigin Pendiente'}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 10,
                    backgroundColor: status?.connected ? '#10B981' : '#F59E0B',
                    color: '#FFFFFF'
                  }}
                >
                  {status?.connected ? 'CONECTADO' : 'REVISAR'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4B5563', marginTop: 2 }}>
                Org: <strong>{status?.orgName || status?.orgId || 'Configurado'}</strong> • Pipeline: <strong>{status?.selectedPipeline?.name || 'Jobs'}</strong> • Etapa Inicial: <strong>Preseleccionados</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(clientId || refreshToken || status?.connected) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                style={{
                  borderColor: '#FECACA',
                  color: '#DC2626',
                  backgroundColor: '#FEF2F2'
                }}
                icon={<Trash2 size={13} color="#DC2626" />}
              >
                {isDisconnecting ? 'Eliminando...' : 'Quitar Credenciales'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              icon={<RefreshCw size={13} className={isTesting ? 'spin' : ''} />}
            >
              {isTesting ? 'Probando...' : 'Probar Conexión'}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: 2
          }}
        >
          <button
            onClick={() => setActiveTab('config')}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'config' ? 700 : 500,
              color: activeTab === 'config' ? 'var(--ats-blue)' : '#64748B',
              borderBottom: activeTab === 'config' ? '2px solid var(--ats-blue)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Lock size={14} />
            <span>Configuración OAuth2</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('logs');
              loadLogs();
            }}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'logs' ? 700 : 500,
              color: activeTab === 'logs' ? 'var(--ats-blue)' : '#64748B',
              borderBottom: activeTab === 'logs' ? '2px solid var(--ats-blue)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Terminal size={14} />
            <span>Registro de Logs en Vivo</span>
            {logs.length > 0 && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: '#E2E8F0',
                  color: '#334155',
                  fontWeight: 700
                }}
              >
                {logs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('subpipelines');
              loadSubPipelines();
            }}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'subpipelines' ? 700 : 500,
              color: activeTab === 'subpipelines' ? 'var(--ats-blue)' : '#64748B',
              borderBottom: activeTab === 'subpipelines' ? '2px solid var(--ats-blue)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Layers size={14} />
            <span>Pestañas / Sub-Pipelines</span>
          </button>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: '0.8rem',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor:
                feedback.type === 'success'
                  ? '#F0FDF4'
                  : feedback.type === 'error'
                  ? '#FEF2F2'
                  : '#EFF6FF',
              border: `1px solid ${
                feedback.type === 'success'
                  ? '#BBF7D0'
                  : feedback.type === 'error'
                  ? '#FECACA'
                  : '#BFDBFE'
              }`,
              color:
                feedback.type === 'success'
                  ? '#166534'
                  : feedback.type === 'error'
                  ? '#991B1B'
                  : '#1E40AF'
            }}
          >
            {feedback.type === 'success' && <CheckCircle2 size={15} />}
            {feedback.type === 'error' && <AlertCircle size={15} />}
            {feedback.type === 'info' && <ShieldCheck size={15} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TAB 1: CONFIGURACIÓN OAUTH2 */}
        {activeTab === 'config' && (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--ats-border)',
              borderRadius: 10,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            {/* ZONA DE CARGA INTELIGENTE: self_client.json */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleSelfClientFile(e.dataTransfer.files[0]);
                }
              }}
              style={{
                padding: '16px 18px',
                backgroundColor: dragOver ? '#F0FDF4' : '#FFFFFF',
                border: `2px dashed ${dragOver ? '#10B981' : '#CBD5E1'}`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                    flexShrink: 0
                  }}
                >
                  <UploadCloud size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                    Carga Rápida: Subir archivo <code>self_client.json</code>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                    Arrastra aquí tu JSON de Zoho Self Client para autocompletar credenciales y conectar al instante.
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSelfClientFile(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploadingJson}
                  onClick={() => fileInputRef.current?.click()}
                  icon={<FileText size={13} />}
                >
                  {isUploadingJson ? 'Leyendo...' : 'Subir self_client.json'}
                </Button>
              </div>
            </div>

            {/* SELECTOR DE PIPELINE ACTIVO */}
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SlidersHorizontal size={15} color="#0066CC" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>
                    Pipeline de Destino en Bigin CRM
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  Define el embudo y las fases de los candidatos
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <select
                    value={status?.selectedPipeline?.id || ''}
                    onChange={(e) => handlePipelineChange(e.target.value)}
                    disabled={isSelectingPipeline || !status?.layouts || status.layouts.length === 0}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: '#F8FAFC',
                      color: '#0F172A',
                      cursor: 'pointer'
                    }}
                  >
                    {status?.layouts && status.layouts.length > 0 ? (
                      status.layouts.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.stages.length} etapas, {l.subPipelines.length} hojas/puestos)
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {status?.selectedPipeline?.name || 'Jobs (Predeterminado)'}
                      </option>
                    )}
                  </select>
                </div>

                {isSelectingPipeline && (
                  <span style={{ fontSize: '0.72rem', color: '#0066CC' }}>Cambiando...</span>
                )}
              </div>

              {/* Fases / Etapas detectadas en el pipeline seleccionado */}
              {status?.stages && status.stages.length > 0 && (
                <div style={{ marginTop: 2 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                    Etapas detectadas en este Pipeline ({status.stages.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {status.stages.map((stage, idx) => (
                      <span
                        key={stage}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #DBEAFE',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>{idx + 1}.</span> {stage}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 8, marginTop: 4 }}>
              <Lock size={15} color="var(--ats-navy)" />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                Credenciales OAuth2 Manuales
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Client ID (Self Client)
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Client Secret
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 36px 8px 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 2
                    }}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Canjear nuevo Authorization Code */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                  Canjear nuevo Grant Code (Zoho Self Client)
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  Válido por 10 minutos
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Pega aquí el código de Zoho Self Client..."
                  value={grantCode}
                  onChange={(e) => setGrantCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace'
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExchangeGrantCode}
                  disabled={isExchanging || !grantCode.trim()}
                  icon={<ArrowRight size={13} />}
                >
                  {isExchanging ? 'Canjeando...' : 'Generar Refresh Token'}
                </Button>
              </div>
            </div>

            {/* Refresh Token Display */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Estado del Refresh Token Permanente
              </label>
              <input
                type="text"
                readOnly
                value={refreshToken || 'No configurado'}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.8rem',
                  backgroundColor: '#F1F5F9',
                  color: '#334155',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div>
                {(clientId || refreshToken || status?.connected) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    style={{
                      borderColor: '#FECACA',
                      color: '#DC2626',
                      backgroundColor: '#FEF2F2'
                    }}
                    icon={<Trash2 size={13} color="#DC2626" />}
                  >
                    {isDisconnecting ? 'Eliminando...' : 'Quitar Credenciales / Desconectar'}
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  variant="cyan"
                  size="sm"
                  onClick={handleSaveCredentials}
                  disabled={isSaving}
                  icon={<ShieldCheck size={13} />}
                >
                  {isSaving ? 'Guardando...' : 'Guardar Credenciales'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTRO DE LOGS EN VIVO */}
        {activeTab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={16} color="var(--ats-navy)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                  Historial de Transacciones con Zoho Bigin API
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLogs(true)}
                  disabled={isLoadingLogs}
                  icon={<RefreshCw size={12} className={isLoadingLogs ? 'spin' : ''} />}
                >
                  Actualizar Logs
                </Button>
                {logs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearLogs}
                    icon={<Trash2 size={12} color="#EF4444" />}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {logs.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px dashed #CBD5E1',
                  color: '#64748B',
                  fontSize: '0.82rem'
                }}
              >
                <Terminal size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>No hay transacciones registradas aún.</p>
                <p style={{ margin: 0, fontSize: '0.75rem' }}>
                  Prueba la conexión o crea una vacante para ver las llamadas HTTP en vivo hacia Bigin.
                </p>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 380,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingRight: 4
                }}
              >
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isCopied = copiedLogId === log.id;

                  const badgeBg =
                    log.type === 'success'
                      ? '#DEF7EC'
                      : log.type === 'error'
                      ? '#FDE8E8'
                      : log.type === 'warning'
                      ? '#FEF08A'
                      : '#E1EFFE';

                  const badgeColor =
                    log.type === 'success'
                      ? '#03543F'
                      : log.type === 'error'
                      ? '#9B1C1C'
                      : log.type === 'warning'
                      ? '#713F12'
                      : '#1E429F';

                  return (
                    <div
                      key={log.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          cursor: 'pointer'
                        }}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {log.action}
                          </span>
                          <span style={{ fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.summary}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                            {log.timestamp}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLog(log);
                            }}
                            title="Copiar Log JSON"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isCopied ? '#10B981' : '#94A3B8',
                              cursor: 'pointer',
                              padding: 2
                            }}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                          {isExpanded ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#64748B" />}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: '1px solid #F1F5F9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}
                        >
                          {log.url && (
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              <strong>Endpoint:</strong> <code style={{ backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: 3 }}>{log.url}</code>
                            </div>
                          )}

                          {log.request && (
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 2 }}>
                                Payload Enviado (Request):
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: 8,
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: 4,
                                  fontSize: '0.72rem',
                                  fontFamily: 'monospace',
                                  maxHeight: 120,
                                  overflowY: 'auto',
                                  border: '1px solid #E2E8F0'
                                }}
                              >
                                {JSON.stringify(log.request, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.response && (
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 2 }}>
                                Respuesta de Bigin (Response):
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: 8,
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: 4,
                                  fontSize: '0.72rem',
                                  fontFamily: 'monospace',
                                  maxHeight: 140,
                                  overflowY: 'auto',
                                  border: '1px solid #E2E8F0'
                                }}
                              >
                                {typeof log.response === 'string' ? log.response : JSON.stringify(log.response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.error && (
                            <div style={{ padding: 8, backgroundColor: '#FEF2F2', borderRadius: 4, color: '#991B1B', fontSize: '0.72rem' }}>
                              <strong>Detalle Error:</strong> {log.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PESTAÑAS / SUB-PIPELINES DETECTADAS */}
        {activeTab === 'subpipelines' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--ats-navy)' }}>
                  Pestañas (Sub-Pipelines) Activas en Bigin {status?.selectedPipeline?.name || 'Jobs'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                  Estas son las hojas existentes detectadas en tu layout de {status?.selectedPipeline?.name || 'Jobs'} en Bigin.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSubPipelines}
                disabled={isLoadingSubPipelines}
                icon={<RefreshCw size={12} className={isLoadingSubPipelines ? 'spin' : ''} />}
              >
                Actualizar
              </Button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activeSubPipelines.map((sp) => (
                <div
                  key={sp}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Layers size={14} color="#0066CC" />
                  <span>{sp}</span>
                  <span style={{ fontSize: '0.65rem', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '1px 5px', borderRadius: 4 }}>
                    Activo
                  </span>
                </div>
              ))}
            </div>

            {/* Guía Clara para crear la pestaña en Bigin */}
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: '#EFF6FF',
                borderRadius: 8,
                border: '1px solid #BFDBFE',
                fontSize: '0.78rem',
                color: '#1E40AF',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={15} color="#1D4ED8" />
                <span>¿Cómo funciona la creación de hojas en Zoho Bigin?</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.45 }}>
                En Zoho Bigin, las <strong>hojas/pestañas</strong> son sub-procesos visuales del Kanban protegidos por la cuenta. Para crear una nueva pestaña:
              </p>
              <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Ingresa a tu cuenta de <strong>Bigin by Zoho CRM</strong>.</li>
                <li>Ve al módulo <strong>Pipelines (Ciclos de Venta)</strong> y abre el pipeline <strong>Jobs</strong>.</li>
                <li>En la barra superior de pestañas, haz clic en el botón <strong><code>+</code></strong> y escribe el nombre de la vacante.</li>
              </ol>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#3B82F6' }}>
                💡 <em>Nota: Si la vacante ya fue creada en la plataforma ATS pero aún no creaste la pestaña con <code>+</code> en Bigin, el sistema guardará al candidato y lo enviará a la pestaña principal activa para que jamás se pierda ninguna postulación ni el correo automático.</em>
              </p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
          <Button variant="outline" size="md" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
