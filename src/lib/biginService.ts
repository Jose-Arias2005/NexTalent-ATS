/**
 * Servicio Cliente de Integración con Zoho Bigin CRM
 * Conecta las vacantes con Sub-Pipelines de Jobs y sincroniza el estado de postulantes.
 */
import { Vacancy2026, ApplicationStatus } from '../types';
import { storage } from './storage';

export interface BiginLayoutInfo {
  id: string;
  name: string;
  isSelected?: boolean;
  subPipelines: string[];
  stages: string[];
}

export interface BiginStatusResponse {
  connected: boolean;
  orgId?: string;
  orgName?: string;
  layoutsCount?: number;
  layouts?: BiginLayoutInfo[];
  selectedPipeline?: { id: string; name: string };
  activeSubPipelines?: string[];
  stages?: string[];
  error?: string;
}

export interface BiginCredentialsResponse {
  clientId: string;
  clientSecret: string;
  hasRefreshToken: boolean;
  orgId: string;
  jobsLayoutId: string;
  initialStage: string;
}

export interface PushCandidateToBiginParams {
  vacancy: {
    id: string;
    title: string;
    biginSubPipelineName?: string;
  };
  candidate: {
    nombre: string;
    dni: string;
    telefono: string;
    correo?: string;
    edad?: number | string;
    actualUltimaPosicion?: string;
    sectorRubro?: string;
    aniosExperiencia?: number | string;
    salarioActualUltimo?: number | string;
    inglesAvanzado?: string;
    maestria?: string;
    tipoEmpresa?: string;
    linkCv?: string;
  };
  application?: {
    customAnswers?: Record<string, any>;
  };
}

/**
 * Consulta el estado de conexión con Zoho Bigin CRM
 */
export async function checkBiginConnection(): Promise<BiginStatusResponse> {
  try {
    const res = await fetch('/api/bigin/status');
    if (!res.ok) {
      return { connected: false, error: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (err: any) {
    return { connected: false, error: err?.message || String(err) };
  }
}

/**
 * Obtiene la configuración y credenciales actuales de Bigin
 */
export async function getBiginConfig(): Promise<BiginCredentialsResponse | null> {
  try {
    const res = await fetch('/api/bigin/credentials');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Guarda credenciales de Bigin en el servidor
 */
export async function saveBiginConfig(creds: {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/bigin/save-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Canjea un código de autorización de Zoho Self Client por un Refresh Token permanente
 */
export async function exchangeBiginCode(
  code: string,
  clientId?: string,
  clientSecret?: string
): Promise<{ success: boolean; refreshToken?: string; error?: string }> {
  try {
    const res = await fetch('/api/bigin/exchange-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, clientId, clientSecret })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Asegura la creación de la "hoja" (Sub_Pipeline) en Bigin al crear un Job nuevo
 */
export interface BiginLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action: string;
  summary: string;
  httpStatus?: number;
  url?: string;
  request?: any;
  response?: any;
  error?: string;
}

/**
 * Consulta los registros y logs en vivo de Bigin
 */
export async function fetchBiginLogs(): Promise<BiginLogEntry[]> {
  try {
    const res = await fetch('/api/bigin/logs');
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  } catch {
    return [];
  }
}

/**
 * Limpia los registros de logs de Bigin
 */
export async function clearBiginLogs(): Promise<boolean> {
  try {
    const res = await fetch('/api/bigin/clear-logs', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Obtiene las pestañas / sub-pipelines activas en el Layout Jobs
 */
export async function fetchActiveBiginSubPipelines(): Promise<string[]> {
  try {
    const res = await fetch('/api/bigin/active-subpipelines');
    if (!res.ok) return ['General 2026', 'Posición Demo'];
    const data = await res.json();
    return data.subPipelines || ['General 2026', 'Posición Demo'];
  } catch {
    return ['General 2026', 'Posición Demo'];
  }
}

/**
 * Verifica en tiempo real si el Sub-Pipeline (hoja) existe exactamente en Bigin CRM
 */
export async function verifyBiginSubPipelineExists(subPipelineName: string): Promise<{
  exists: boolean;
  subPipelineName: string;
  matchedName?: string;
  pipelineName?: string;
  availableSubPipelines: string[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/bigin/verify-subpipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subPipelineName })
    });
    if (!res.ok) {
      return {
        exists: false,
        subPipelineName: subPipelineName.trim(),
        availableSubPipelines: []
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      exists: false,
      subPipelineName: subPipelineName.trim(),
      availableSubPipelines: [],
      error: err?.message || String(err)
    };
  }
}

/**
 * Asegura la creación de la "hoja" (Sub_Pipeline) en Bigin al crear un Job nuevo
 */
export async function ensureBiginSubPipeline(vacancyTitle: string): Promise<{
  success: boolean;
  subPipelineName: string;
  created: boolean;
  alreadyExists?: boolean;
  activeSubPipelines?: string[];
  message?: string;
  warning?: string;
  error?: string;
}> {
  const check = await verifyBiginSubPipelineExists(vacancyTitle);
  return {
    success: check.exists,
    subPipelineName: check.matchedName || vacancyTitle.trim(),
    created: false,
    alreadyExists: check.exists,
    activeSubPipelines: check.availableSubPipelines,
    warning: check.exists ? undefined : `Aún no existe la hoja "${vacancyTitle.trim()}" en Bigin.`
  };
}

/**
 * Envía la postulación a Zoho Bigin:
 * 1. Crea o actualiza el Contacto con el Correo Electrónico
 * 2. Registra el Trato en la hoja del Job dentro de la etapa "Preseleccionados"
 * 3. Habilita los triggers para disparo automático de workflows y correos de Bigin
 */
export async function pushCandidateToBigin(params: PushCandidateToBiginParams): Promise<{
  success: boolean;
  contactId?: string;
  dealId?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/bigin/push-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }

    return await res.json();
  } catch (err: any) {
    console.error('[Bigin pushCandidate client error]:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Mapea la etapa de Zoho Bigin a ApplicationStatus del ATS
 */
export function mapBiginStageToApplicationStatus(biginStage: string): ApplicationStatus {
  const norm = (biginStage || '').toLowerCase().trim();
  if (norm.includes('preseleccionado')) return 'revision';
  if (norm.includes('evaluación') || norm.includes('evaluacion')) return 'en_revision';
  if (norm.includes('entrevista')) return 'entrevista';
  if (norm.includes('ofertado') || norm.includes('propuesta') || norm.includes('shortlist') || norm.includes('terna') || norm.includes('finalista')) return 'shortlist';
  if (norm.includes('contratado')) return 'contratado';
  if (norm.includes('rechazado') || norm.includes('descartado') || norm.includes('caído') || norm.includes('caido') || norm.includes('sin acuerdo')) return 'descartado';
  return 'revision';
}

/**
 * Sincroniza las etapas reales de los candidatos desde Bigin hacia IndexedDB
 */
export async function syncPipelineStagesFromBigin(vacancy: Vacancy2026): Promise<{
  success: boolean;
  syncedCount: number;
  totalDeals: number;
  deals: Array<{
    id: string;
    dealName: string;
    stage: string;
    contactName?: string;
    contactId?: string;
  }>;
  error?: string;
}> {
  const subPipelineName = vacancy.biginSubPipelineName || vacancy.title;

  try {
    const res = await fetch('/api/bigin/sync-pipeline-stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subPipelineName })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, syncedCount: 0, totalDeals: 0, deals: [], error: `HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json();
    const deals = data.deals || [];

    // Obtener candidatos y postulaciones de la vacante en IndexedDB
    const allApps = storage.getApplicationsByVacancy(vacancy.id);
    const allCandidates = storage.getCandidates2026();

    let syncedCount = 0;

    for (const app of allApps) {
      const candidate = allCandidates.find(
        (c) => c.dni.trim().toUpperCase() === app.candidateDni.trim().toUpperCase()
      );

      // Buscar el trato correspondiente en Bigin
      const matchedDeal = deals.find((d: any) => {
        const desc = (d.description || '').toLowerCase();
        const dealName = (d.dealName || '').toLowerCase();
        const contactName = (d.contactName || '').toLowerCase();

        // 1. Match por DNI en la descripción del deal
        if (app.candidateDni && desc.includes(app.candidateDni.toLowerCase().trim())) {
          return true;
        }

        // 2. Match por nombre completo del candidato
        if (candidate?.nombre) {
          const cleanName = candidate.nombre.toLowerCase().trim();
          if (contactName && contactName.includes(cleanName)) return true;
          if (dealName && dealName.includes(cleanName)) return true;
        }

        return false;
      });

      if (matchedDeal && matchedDeal.stage) {
        const mappedStatus = mapBiginStageToApplicationStatus(matchedDeal.stage);
        const updatedApp = {
          ...app,
          biginStage: matchedDeal.stage,
          biginDealId: matchedDeal.id,
          status: mappedStatus,
          customAnswers: {
            ...(app.customAnswers || {}),
            bigin_stage: matchedDeal.stage
          }
        };

        await storage.saveApplication2026(updatedApp);
        syncedCount++;
      }
    }

    return {
      success: true,
      syncedCount,
      totalDeals: deals.length,
      deals
    };
  } catch (err: any) {
    console.error('Error sincronizando etapas de Bigin:', err);
    return {
      success: false,
      syncedCount: 0,
      totalDeals: 0,
      deals: [],
      error: err?.message || String(err)
    };
  }
}

/**
 * Sube y procesa el archivo self_client.json
 */
export async function uploadSelfClient(content: any): Promise<{
  success: boolean;
  clientId?: string;
  hasSecret?: boolean;
  hasCode?: boolean;
  hasRefreshToken?: boolean;
  autoConnected?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/bigin/upload-self-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content)
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Selecciona y persiste el Pipeline/Layout activo en Bigin
 */
export async function selectBiginPipeline(pipelineId: string, pipelineName: string): Promise<{
  success: boolean;
  selectedPipeline?: { id: string; name: string };
  error?: string;
}> {
  try {
    const res = await fetch('/api/bigin/select-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineId, pipelineName })
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Elimina las credenciales y tokens de Bigin para reconfigurar desde cero
 */
export async function disconnectBigin(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/bigin/disconnect', {
      method: 'POST'
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}


