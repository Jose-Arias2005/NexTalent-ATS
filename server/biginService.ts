import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const biginTokenPath = path.join(projectRoot, 'bigin_token.json');
const selfClientPath = path.join(projectRoot, 'self_client.json');

// Default configuration constants for Zoho Bigin CRM (Template placeholders)
export const BIGIN_DEFAULTS = {
  orgId: process.env.BIGIN_ORG_ID || '',
  jobsLayoutId: process.env.BIGIN_LAYOUT_ID || '',
  jobsPipelineId: process.env.BIGIN_PIPELINE_ID || '',
  initialStage: 'Preseleccionados',
  clientId: process.env.BIGIN_CLIENT_ID || '',
  clientSecret: process.env.BIGIN_CLIENT_SECRET || ''
};

// ----------------------------------------------------------------------------
// IN-MEMORY LIVE LOGS SYSTEM
// ----------------------------------------------------------------------------
export interface BiginLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action: string;
  summary: string;
  details?: string;
  httpStatus?: number;
  url?: string;
  request?: any;
  response?: any;
  error?: string;
}

const MAX_LOGS = 120;
const biginLogs: BiginLogEntry[] = [];

export function addBiginLog(entry: Omit<BiginLogEntry, 'id' | 'timestamp'>): BiginLogEntry {
  const date = new Date();
  const timeStr = date.toLocaleTimeString('es-PE', { hour12: false }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
  const dateStr = date.toISOString().slice(0, 10);
  
  const newLog: BiginLogEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: `${dateStr} ${timeStr}`,
    ...entry
  };
  
  biginLogs.unshift(newLog);
  if (biginLogs.length > MAX_LOGS) {
    biginLogs.pop();
  }
  return newLog;
}

export function getBiginLogs(): BiginLogEntry[] {
  return biginLogs;
}

export function clearBiginLogs(): void {
  biginLogs.length = 0;
}

// In-memory token cache
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export interface BiginCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  apiDomain?: string;
  selectedPipelineId?: string;
  selectedPipelineName?: string;
  orgId?: string;
}

export interface BiginLayoutInfo {
  id: string;
  name: string;
  isSelected?: boolean;
  subPipelines: string[];
  stages: string[];
}

/**
 * Loads credentials from bigin_token.json or self_client.json
 */
export function loadBiginCredentials(): BiginCredentials {
  if (fs.existsSync(biginTokenPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(biginTokenPath, 'utf8'));
      if (data.refresh_token) {
        return {
          clientId: data.client_id || BIGIN_DEFAULTS.clientId,
          clientSecret: data.client_secret || BIGIN_DEFAULTS.clientSecret,
          refreshToken: data.refresh_token,
          accessToken: data.access_token,
          apiDomain: data.api_domain || 'https://www.zohoapis.com',
          selectedPipelineId: data.selected_pipeline_id || '',
          selectedPipelineName: data.selected_pipeline_name || '',
          orgId: data.org_id || BIGIN_DEFAULTS.orgId
        };
      }
    } catch (err) {
      console.warn('Error reading bigin_token.json:', err);
    }
  }

  // Fallback to self_client.json
  if (fs.existsSync(selfClientPath)) {
    try {
      const sc = JSON.parse(fs.readFileSync(selfClientPath, 'utf8'));
      return {
        clientId: sc.client_id || sc.clientId || BIGIN_DEFAULTS.clientId,
        clientSecret: sc.client_secret || sc.clientSecret || BIGIN_DEFAULTS.clientSecret,
        refreshToken: sc.refresh_token || sc.refreshToken || '',
        apiDomain: sc.api_domain || 'https://www.zohoapis.com',
        selectedPipelineId: sc.selected_pipeline_id || sc.selectedPipelineId || '',
        selectedPipelineName: sc.selected_pipeline_name || sc.selectedPipelineName || '',
        orgId: sc.org_id || sc.orgId || BIGIN_DEFAULTS.orgId
      };
    } catch {
      // Ignore
    }
  }

  return {
    clientId: BIGIN_DEFAULTS.clientId,
    clientSecret: BIGIN_DEFAULTS.clientSecret,
    refreshToken: '',
    apiDomain: 'https://www.zohoapis.com',
    selectedPipelineId: '',
    selectedPipelineName: '',
    orgId: BIGIN_DEFAULTS.orgId
  };
}

/**
 * Saves or updates credentials in bigin_token.json
 */
export function saveBiginCredentials(creds: Partial<BiginCredentials>): void {
  const current = loadBiginCredentials();
  const updated = {
    client_id: creds.clientId || current.clientId,
    client_secret: creds.clientSecret || current.clientSecret,
    refresh_token: creds.refreshToken || current.refreshToken,
    access_token: creds.accessToken || current.accessToken || '',
    api_domain: creds.apiDomain || current.apiDomain || 'https://www.zohoapis.com',
    selected_pipeline_id: creds.selectedPipelineId !== undefined ? creds.selectedPipelineId : current.selectedPipelineId,
    selected_pipeline_name: creds.selectedPipelineName !== undefined ? creds.selectedPipelineName : current.selectedPipelineName,
    org_id: creds.orgId !== undefined ? creds.orgId : current.orgId
  };

  fs.writeFileSync(biginTokenPath, JSON.stringify(updated, null, 2), 'utf8');
  if (creds.accessToken) {
    cachedAccessToken = creds.accessToken;
    tokenExpiresAt = Date.now() + 3500 * 1000;
  }
}

/**
 * Persists user's selected Pipeline/Layout
 */
export function selectBiginPipeline(pipelineId: string, pipelineName: string): {
  success: boolean;
  selectedPipeline: { id: string; name: string };
} {
  saveBiginCredentials({
    selectedPipelineId: pipelineId,
    selectedPipelineName: pipelineName
  });

  addBiginLog({
    type: 'info',
    action: 'Seleccionar Pipeline',
    summary: `Pipeline activo configurado a "${pipelineName}" (ID: ${pipelineId}).`
  });

  return { success: true, selectedPipeline: { id: pipelineId, name: pipelineName } };
}

/**
 * Uploads, parses and processes self_client.json
 */
export async function uploadSelfClientFile(content: any): Promise<{
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
    const parsed: any = typeof content === 'string' ? JSON.parse(content) : content;

    const cId = parsed.client_id || parsed.clientId || parsed.client_ID || '';
    const cSec = parsed.client_secret || parsed.clientSecret || parsed.client_SECRET || '';
    const grantCode = parsed.grant_token || parsed.code || parsed.grantCode || parsed.authorization_code || '';
    const refToken = parsed.refresh_token || parsed.refreshToken || '';

    if (!cId && !cSec && !grantCode && !refToken) {
      return { success: false, error: 'El archivo JSON no contiene campos reconocibles de Zoho (client_id, client_secret).' };
    }

    fs.writeFileSync(selfClientPath, JSON.stringify(parsed, null, 2), 'utf8');

    if (refToken) {
      saveBiginCredentials({
        clientId: cId,
        clientSecret: cSec,
        refreshToken: refToken
      });
      return {
        success: true,
        clientId: cId,
        hasSecret: Boolean(cSec),
        hasRefreshToken: true,
        autoConnected: true,
        message: '¡Archivo self_client.json cargado con Refresh Token activo! Conexión lista.'
      };
    }

    if (grantCode && cId && cSec) {
      const exchange = await exchangeBiginAuthorizationCode(grantCode, cId, cSec);
      if (exchange.success) {
        return {
          success: true,
          clientId: cId,
          hasSecret: true,
          hasCode: true,
          hasRefreshToken: true,
          autoConnected: true,
          message: '¡Archivo self_client.json cargado y código canjeado automáticamente por Refresh Token!'
        };
      }
    }

    if (cId || cSec) {
      saveBiginCredentials({
        clientId: cId,
        clientSecret: cSec
      });
    }

    return {
      success: true,
      clientId: cId,
      hasSecret: Boolean(cSec),
      hasCode: Boolean(grantCode),
      hasRefreshToken: false,
      autoConnected: false,
      message: 'Archivo self_client.json cargado exitosamente. Client ID y Secret autocompletados.'
    };
  } catch (err: any) {
    return { success: false, error: `Error procesando JSON de self_client: ${err?.message || err}` };
  }
}

/**
 * Removes and resets all stored Zoho Bigin tokens and credentials
 */
export function disconnectBigin(): { success: boolean; message: string } {
  cachedAccessToken = null;
  tokenExpiresAt = 0;

  if (fs.existsSync(biginTokenPath)) {
    try {
      fs.unlinkSync(biginTokenPath);
    } catch {
      fs.writeFileSync(biginTokenPath, '{}', 'utf8');
    }
  }

  if (fs.existsSync(selfClientPath)) {
    try {
      fs.unlinkSync(selfClientPath);
    } catch {
      fs.writeFileSync(selfClientPath, '{}', 'utf8');
    }
  }

  addBiginLog({
    type: 'warning',
    action: 'Desconectar Bigin',
    summary: 'Credenciales y tokens de Zoho Bigin eliminados. Listo para nueva configuración.'
  });

  return {
    success: true,
    message: 'Credenciales eliminadas correctamente. Ahora puedes ingresar o subir una nueva configuración.'
  };
}

/**
 * Exchanges an Authorization Code (from Zoho Self Client) for a permanent Refresh Token
 */
export async function exchangeBiginAuthorizationCode(
  code: string,
  clientId?: string,
  clientSecret?: string
): Promise<{ success: boolean; refreshToken?: string; error?: string }> {
  const creds = loadBiginCredentials();
  const cId = clientId || creds.clientId || BIGIN_DEFAULTS.clientId;
  const cSec = clientSecret || creds.clientSecret || BIGIN_DEFAULTS.clientSecret;

  const params = new URLSearchParams({
    code: code.trim(),
    client_id: cId,
    client_secret: cSec,
    grant_type: 'authorization_code'
  });

  addBiginLog({
    type: 'info',
    action: 'Canjear Authorization Code',
    summary: 'Enviando solicitud de canje a https://accounts.zoho.com/oauth/v2/token',
    url: 'https://accounts.zoho.com/oauth/v2/token',
    request: { client_id: cId, grant_type: 'authorization_code', code_prefix: code.slice(0, 10) + '...' }
  });

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = (await res.json()) as any;

  if (data.error) {
    addBiginLog({
      type: 'error',
      action: 'Canjear Authorization Code',
      summary: `Zoho rechazó el código: ${data.error}`,
      httpStatus: res.status,
      response: data
    });
    return { success: false, error: data.error || 'Error al canjear código en Zoho' };
  }

  if (data.refresh_token) {
    saveBiginCredentials({
      clientId: cId,
      clientSecret: cSec,
      refreshToken: data.refresh_token,
      accessToken: data.access_token,
      apiDomain: data.api_domain || 'https://www.zohoapis.com'
    });

    addBiginLog({
      type: 'success',
      action: 'Canjear Authorization Code',
      summary: '¡Refresh token permanente obtenido y guardado exitosamente!',
      httpStatus: 200,
      response: { refresh_token_prefix: data.refresh_token.slice(0, 15) + '...', api_domain: data.api_domain }
    });

    return { success: true, refreshToken: data.refresh_token };
  }

  addBiginLog({
    type: 'warning',
    action: 'Canjear Authorization Code',
    summary: 'Zoho no devolvió refresh_token (posiblemente código ya canjeado previamente).',
    httpStatus: res.status,
    response: data
  });

  return { success: false, error: data.message || 'Zoho no devolvió refresh_token' };
}

/**
 * Obtains a fresh access token for Zoho Bigin
 */
export async function getValidBiginAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const creds = loadBiginCredentials();
  if (creds.accessToken) {
    cachedAccessToken = creds.accessToken;
    tokenExpiresAt = Date.now() + 1800 * 1000;
  }

  if (!creds.refreshToken) {
    throw new Error('No se encontró refresh_token de Zoho Bigin en bigin_token.json ni self_client.json');
  }

  const params = new URLSearchParams({
    refresh_token: creds.refreshToken,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: 'refresh_token'
  });

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = (await res.json()) as any;

  if (data.error) {
    addBiginLog({
      type: 'error',
      action: 'Renovar Access Token',
      summary: `Fallo al renovar access token: ${data.error}`,
      httpStatus: res.status,
      response: data
    });
    throw new Error(`Error renovando access_token en Zoho: ${data.error}`);
  }

  if (!data.access_token) {
    throw new Error('Zoho no retornó un access_token válido');
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000 - 120000;

  // Persist latest access token
  saveBiginCredentials({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    refreshToken: creds.refreshToken,
    accessToken: data.access_token,
    apiDomain: data.api_domain || creds.apiDomain
  });

  return data.access_token;
}

export function parseLayoutsData(layouts: any[]): BiginLayoutInfo[] {
  return (layouts || []).map((layout: any) => {
    let subPipField: any = null;
    let stageField: any = null;
    for (const sec of layout?.sections || []) {
      for (const f of sec.fields || []) {
        if (f.api_name === 'Sub_Pipeline') subPipField = f;
        if (f.api_name === 'Stage') stageField = f;
      }
    }

    const subPipelines: string[] = (subPipField?.pick_list_values || [])
      .map((p: any) => p.display_value?.trim())
      .filter((v: string) => v && v !== '-None-');

    const stages: string[] = (stageField?.pick_list_values || [])
      .map((p: any) => p.display_value?.trim())
      .filter((v: string) => v && v !== '-None-');

    return {
      id: layout.id,
      name: layout.name,
      subPipelines,
      stages
    };
  });
}

/**
 * Checks connection status with Zoho Bigin CRM and returns available pipelines & stages
 */
export async function getBiginStatus(): Promise<{
  connected: boolean;
  orgId?: string;
  orgName?: string;
  layoutsCount?: number;
  layouts?: BiginLayoutInfo[];
  selectedPipeline?: { id: string; name: string };
  activeSubPipelines?: string[];
  stages?: string[];
  error?: string;
}> {
  try {
    const token = await getValidBiginAccessToken();
    const creds = loadBiginCredentials();

    const res = await fetch('https://www.zohoapis.com/bigin/v2/settings/layouts?module=Pipelines', {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      addBiginLog({
        type: 'error',
        action: 'Verificar Conexión',
        summary: `Error consultando layouts en Bigin (HTTP ${res.status})`,
        httpStatus: res.status,
        url: 'https://www.zohoapis.com/bigin/v2/settings/layouts?module=Pipelines',
        response: errText
      });
      return { connected: false, error: `Error ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as any;
    const parsedLayouts = parseLayoutsData(data?.layouts || []);

    const targetId = creds.selectedPipelineId;
    const targetName = creds.selectedPipelineName;

    let activeLayout = parsedLayouts.find((l) => 
      (targetId && l.id === targetId) || 
      (targetName && l.name.toLowerCase() === targetName.toLowerCase())
    );

    if (!activeLayout) {
      activeLayout = parsedLayouts.find((l) => l.name.toLowerCase() === 'jobs') || parsedLayouts[0];
    }

    let orgName: string | undefined;
    let orgId: string | undefined = creds.orgId || BIGIN_DEFAULTS.orgId;
    try {
      const orgRes = await fetch('https://www.zohoapis.com/bigin/v2/org', {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });
      if (orgRes.ok) {
        const orgData = (await orgRes.json()) as any;
        if (orgData?.org?.[0]) {
          orgName = orgData.org[0].company_name;
          orgId = orgData.org[0].zgid || orgData.org[0].id || orgId;
        }
      }
    } catch {
      // Ignore org error
    }

    const activeSubPipelines = activeLayout?.subPipelines || [];
    const stages = activeLayout?.stages || [];

    addBiginLog({
      type: 'success',
      action: 'Verificar Conexión',
      summary: `Conexión verificada OK con Bigin (Pipeline: "${activeLayout?.name || 'Jobs'}", Org: ${orgId || 'N/A'}). Pestañas: ${activeSubPipelines.length}, Etapas: ${stages.length}`,
      httpStatus: 200,
      response: {
        layoutsCount: parsedLayouts.length,
        selectedPipeline: activeLayout ? { id: activeLayout.id, name: activeLayout.name } : undefined,
        activeSubPipelines,
        stages
      }
    });

    return {
      connected: true,
      orgId,
      orgName,
      layoutsCount: parsedLayouts.length,
      layouts: parsedLayouts.map((l) => ({
        ...l,
        isSelected: l.id === activeLayout?.id
      })),
      selectedPipeline: activeLayout ? { id: activeLayout.id, name: activeLayout.name } : undefined,
      activeSubPipelines,
      stages
    };
  } catch (err: any) {
    addBiginLog({
      type: 'error',
      action: 'Verificar Conexión',
      summary: `Excepción verificando conexión: ${err?.message || err}`,
      error: err?.message || String(err)
    });
    return { connected: false, error: err?.message || String(err) };
  }
}

/**
 * Returns active Sub_Pipelines in Bigin's selected layout
 */
export async function getActiveBiginSubPipelines(): Promise<string[]> {
  try {
    const status = await getBiginStatus();
    return status.activeSubPipelines && status.activeSubPipelines.length > 0
      ? status.activeSubPipelines
      : ['General 2026', 'Posición Demo'];
  } catch {
    return ['General 2026', 'Posición Demo'];
  }
}

/**
 * Ensures that a Sub_Pipeline exists in the Jobs layout in Bigin.
 * Explains and logs the exact behavior for user transparency.
 */
/**
 * Verifica si un Sub-Pipeline (hoja) existe exactamente en el Layout Jobs de Bigin
 */
export async function verifyBiginSubPipeline(subPipelineName: string): Promise<{
  exists: boolean;
  subPipelineName: string;
  matchedName?: string;
  availableSubPipelines: string[];
  error?: string;
}> {
  const cleanName = subPipelineName.trim();
  if (!cleanName) {
    return {
      exists: false,
      subPipelineName: '',
      availableSubPipelines: []
    };
  }

  addBiginLog({
    type: 'info',
    action: 'Verificar Sub-Pipeline',
    summary: `Verificando existencia del Sub-Pipeline: "${cleanName}" en Bigin CRM...`,
    request: { subPipelineName: cleanName }
  });

  try {
    const token = await getValidBiginAccessToken();

    const res = await fetch('https://www.zohoapis.com/bigin/v2/settings/layouts?module=Pipelines', {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      addBiginLog({
        type: 'error',
        action: 'Verificar Sub-Pipeline',
        summary: `Error consultando layouts en Bigin (HTTP ${res.status})`,
        httpStatus: res.status,
        response: errText
      });
      return {
        exists: false,
        subPipelineName: cleanName,
        availableSubPipelines: [],
        error: `HTTP ${res.status}: ${errText}`
      };
    }

    const data = (await res.json()) as any;
    const parsedLayouts = parseLayoutsData(data?.layouts || []);
    const creds = loadBiginCredentials();

    const targetId = creds.selectedPipelineId;
    const targetName = creds.selectedPipelineName;

    let activeLayout = parsedLayouts.find((l) => 
      (targetId && l.id === targetId) || 
      (targetName && l.name.toLowerCase() === targetName.toLowerCase())
    );

    if (!activeLayout) {
      activeLayout = parsedLayouts.find((l) => l.name.toLowerCase() === 'jobs') || parsedLayouts[0];
    }

    const availableSubPipelines = activeLayout?.subPipelines || [];

    // Comparación exacta ignorando mayúsculas/minúsculas y espacios externos
    const matched = availableSubPipelines.find(
      (name) => name.toLowerCase() === cleanName.toLowerCase()
    );

    const exists = Boolean(matched);

    addBiginLog({
      type: exists ? 'success' : 'warning',
      action: 'Verificar Sub-Pipeline',
      summary: exists
        ? `✓ Sub-Pipeline "${cleanName}" verificado con éxito en Bigin.`
        : `❌ Sub-Pipeline "${cleanName}" aún no existe en Bigin. Disponibles: [${availableSubPipelines.join(', ')}]`,
      response: { exists, matchedName: matched, availableSubPipelines }
    });

    return {
      exists,
      subPipelineName: cleanName,
      matchedName: matched || undefined,
      availableSubPipelines
    };
  } catch (err: any) {
    addBiginLog({
      type: 'error',
      action: 'Verificar Sub-Pipeline',
      summary: `Excepción verificando Sub-Pipeline: ${err?.message || err}`,
      error: err?.message || String(err)
    });
    return {
      exists: false,
      subPipelineName: cleanName,
      availableSubPipelines: [],
      error: err?.message || String(err)
    };
  }
}

/**
 * Función heredada para compatibilidad (llama a verifyBiginSubPipeline)
 */
export async function ensureBiginSubPipeline(vacancyTitle: string): Promise<any> {
  const result = await verifyBiginSubPipeline(vacancyTitle);
  return {
    success: result.exists,
    subPipelineName: result.matchedName || vacancyTitle.trim(),
    created: false,
    alreadyExists: result.exists,
    activeSubPipelines: result.availableSubPipelines,
    warning: result.exists ? undefined : `Aún no existe la hoja "${vacancyTitle.trim()}" en Bigin.`
  };
}

export interface PushCandidateParams {
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
 * Pushes candidate to Zoho Bigin:
 * 1. Upserts Contact (for email auto-responder)
 * 2. Creates Deal under "Jobs" layout in stage "Preseleccionados" with trigger enabled
 */
export async function pushCandidateToBigin(params: PushCandidateParams): Promise<{
  success: boolean;
  contactId?: string;
  dealId?: string;
  error?: string;
}> {
  addBiginLog({
    type: 'info',
    action: 'Postulación Candidato',
    summary: `Iniciando sincronización de candidato: ${params.candidate.nombre} (${params.candidate.correo || 'sin correo'}) para vacante "${params.vacancy.title}"`,
    request: {
      candidato: params.candidate.nombre,
      correo: params.candidate.correo,
      telefono: params.candidate.telefono,
      vacante: params.vacancy.title,
      subPipelineDeseado: params.vacancy.biginSubPipelineName || params.vacancy.title
    }
  });

  try {
    const token = await getValidBiginAccessToken();

    // ------------------------------------------------------------------------
    // PASO A: Crear o Actualizar Contacto en Bigin (Garantiza envío del correo)
    // Se envía explícitamente First_Name: "" para evitar concatenaciones repetidas de nombres
    // ------------------------------------------------------------------------
    const contactEmail = params.candidate.correo?.trim() || '';
    const contactPayload = {
      data: [
        {
          First_Name: '',
          Last_Name: params.candidate.nombre.trim(),
          Email: contactEmail || undefined,
          Mobile: params.candidate.telefono.trim(),
          Phone: params.candidate.telefono.trim(),
          Description: `DNI: ${params.candidate.dni} | Posición actual: ${params.candidate.actualUltimaPosicion || '-'} | Sector: ${params.candidate.sectorRubro || '-'}`
        }
      ],
      duplicate_check_fields: contactEmail ? ['Email'] : ['Mobile']
    };

    const contactRes = await fetch('https://www.zohoapis.com/bigin/v2/Contacts/upsert', {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactPayload)
    });

    const contactData = (await contactRes.json()) as any;
    const contactId = contactData?.data?.[0]?.details?.id;

    addBiginLog({
      type: contactId ? 'success' : 'warning',
      action: 'Crear Contacto Bigin',
      summary: contactId
        ? `Contacto ${contactData?.data?.[0]?.action === 'update' ? 'actualizado (limpiando First_Name)' : 'creado'} con ID: ${contactId}`
        : 'Bigin no retornó ID de contacto.',
      httpStatus: contactRes.status,
      response: contactData
    });

    // ------------------------------------------------------------------------
    // PASO B: Verificar si ya existe un trato en este Sub_Pipeline para evitar duplicados
    // ------------------------------------------------------------------------
    const closingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const subPipelineName = params.vacancy.biginSubPipelineName || params.vacancy.title;

    const description = [
      `DNI: ${params.candidate.dni}`,
      `Edad: ${params.candidate.edad || '-'}`,
      `Salario Actual/Último: ${params.candidate.salarioActualUltimo || '-'}`,
      `Inglés Avanzado: ${params.candidate.inglesAvanzado || '-'}`,
      `Maestría: ${params.candidate.maestria || '-'}`,
      `Tipo de Empresa: ${params.candidate.tipoEmpresa || '-'}`,
      `CV: ${params.candidate.linkCv || '-'}`
    ].join('\n');

    let existingDealId: string | null = null;
    try {
      const fields = 'Deal_Name,Stage,Sub_Pipeline,Contact_Name,Description,Closing_Date';
      const checkRes = await fetch(`https://www.zohoapis.com/bigin/v2/Pipelines?fields=${encodeURIComponent(fields)}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });
      if (checkRes.ok) {
        const checkData = (await checkRes.json()) as any;
        const deals = checkData.data || [];
        const cleanSub = subPipelineName.trim().toLowerCase();
        const candDni = params.candidate.dni.trim().toLowerCase();
        const candName = params.candidate.nombre.trim().toLowerCase();

        const found = deals.find((d: any) => {
          const dSub = (d.Sub_Pipeline || '').trim().toLowerCase();
          if (dSub !== cleanSub) return false;
          if (contactId && d.Contact_Name?.id === contactId) return true;
          if (candDni && d.Description && d.Description.toLowerCase().includes(candDni)) return true;
          if (candName && d.Deal_Name && d.Deal_Name.toLowerCase().includes(candName)) return true;
          return false;
        });

        if (found) {
          existingDealId = found.id;
        }
      }
    } catch (checkErr) {
      console.warn('Error comprobando trato existente en Bigin:', checkErr);
    }

    let dealId: string | undefined;
    let dealData: any;

    if (existingDealId) {
      // Actualizar trato existente para no duplicarlo
      const updatePayload = {
        data: [
          {
            id: existingDealId,
            Deal_Name: `${params.candidate.nombre.trim()} - ${params.vacancy.title}`,
            Closing_Date: closingDate,
            Description: description,
            Contact_Name: contactId ? { id: contactId } : undefined
          }
        ]
      };

      const updateRes = await fetch(`https://www.zohoapis.com/bigin/v2/Pipelines`, {
        method: 'PUT',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      dealData = (await updateRes.json()) as any;
      dealId = dealData?.data?.[0]?.details?.id || existingDealId;

      addBiginLog({
        type: 'success',
        action: 'Actualizar Trato Bigin',
        summary: `Trato existente ID ${dealId} actualizado con éxito en "${subPipelineName}" (sin duplicados).`,
        httpStatus: updateRes.status,
        response: dealData
      });
    } else {
      // Crear nuevo trato en la hoja del Job en la etapa inicial con triggers
      const creds = loadBiginCredentials();
      const pipelineName = creds.selectedPipelineName || 'Jobs';
      const pipelineId = creds.selectedPipelineId || undefined;

      const dealPayload = {
        data: [
          {
            Deal_Name: `${params.candidate.nombre.trim()} - ${params.vacancy.title}`,
            Pipeline: pipelineId ? { id: pipelineId, name: pipelineName } : { name: pipelineName },
            Layout: pipelineId ? { id: pipelineId } : undefined,
            Sub_Pipeline: subPipelineName,
            Stage: BIGIN_DEFAULTS.initialStage,
            Contact_Name: contactId ? { id: contactId } : undefined,
            Closing_Date: closingDate,
            Description: description
          }
        ],
        trigger: ['workflow', 'blueprint', 'approval']
      };

      const dealRes = await fetch('https://www.zohoapis.com/bigin/v2/Pipelines', {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dealPayload)
      });

      dealData = (await dealRes.json()) as any;
      dealId = dealData?.data?.[0]?.details?.id;

      if (dealId) {
        addBiginLog({
          type: 'success',
          action: 'Crear Trato Bigin',
          summary: `¡Trato creado exitosamente en Bigin! ID: ${dealId} en etapa "Preseleccionados" (Workflow disparado).`,
          httpStatus: 201,
          response: dealData
        });
      } else {
        addBiginLog({
          type: 'error',
          action: 'Crear Trato Bigin',
          summary: `Error al crear trato en Bigin (HTTP ${dealRes.status})`,
          httpStatus: dealRes.status,
          response: dealData
        });
      }
    }

    return {
      success: !!dealId,
      contactId,
      dealId,
      error: !dealId ? JSON.stringify(dealData) : undefined
    };
  } catch (err: any) {
    addBiginLog({
      type: 'error',
      action: 'Postulación Candidato',
      summary: `Excepción general al sincronizar con Bigin: ${err?.message || err}`,
      error: err?.message || String(err)
    });
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Consulta los tratos de Pipelines en Bigin para una vacante específica
 */
export async function fetchPipelineDealsForVacancy(subPipelineName: string): Promise<{
  success: boolean;
  deals: Array<{
    id: string;
    dealName: string;
    stage: string;
    subPipeline: string;
    contactName?: string;
    contactId?: string;
    description?: string;
    closingDate?: string;
  }>;
  error?: string;
}> {
  try {
    const token = await getValidBiginAccessToken();
    const fields = 'Deal_Name,Stage,Sub_Pipeline,Contact_Name,Description,Closing_Date';
    const res = await fetch(`https://www.zohoapis.com/bigin/v2/Pipelines?fields=${encodeURIComponent(fields)}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, deals: [], error: `HTTP ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as any;
    const allDeals = data.data || [];
    const cleanTarget = (subPipelineName || '').trim().toLowerCase();

    const matchingDeals = allDeals
      .filter((d: any) => {
        if (!cleanTarget) return true;
        const sub = (d.Sub_Pipeline || '').trim().toLowerCase();
        return sub === cleanTarget;
      })
      .map((d: any) => ({
        id: d.id,
        dealName: d.Deal_Name || '',
        stage: d.Stage || '',
        subPipeline: d.Sub_Pipeline || '',
        contactName: d.Contact_Name?.name || '',
        contactId: d.Contact_Name?.id || '',
        description: d.Description || '',
        closingDate: d.Closing_Date || ''
      }));

    addBiginLog({
      type: 'info',
      action: 'Sincronizar Tratos Bigin',
      summary: `Recuperados ${matchingDeals.length} tratos para "${subPipelineName}" desde Bigin CRM.`,
      response: { count: matchingDeals.length }
    });

    return { success: true, deals: matchingDeals };
  } catch (err: any) {
    addBiginLog({
      type: 'error',
      action: 'Sincronizar Tratos Bigin',
      summary: `Excepción obteniendo tratos: ${err?.message || err}`,
      error: err?.message || String(err)
    });
    return { success: false, deals: [], error: err?.message || String(err) };
  }
}

