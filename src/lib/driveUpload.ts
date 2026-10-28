/**
 * Servicio Cliente de Carga de CVs a Google Drive y sincronización de Google Sheets.
 */

export interface UploadCvParams {
  file: File;
  candidateDni: string;
  candidateName: string;
  vacancyTitle?: string;
  folderUrl?: string;
}

export interface UploadCvResult {
  success: boolean;
  linkCv: string;
  isDriveLink: boolean;
  fileId?: string;
  filename: string;
  error?: string;
}

/**
 * Sanitiza el nombre de archivo para evitar caracteres inválidos o path traversal
 */
export function generateSafeCvFilename(originalName: string, dni: string, candidateName: string): string {
  const ext = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
  const validExt = ext === '.docx' ? '.docx' : '.pdf';
  
  const cleanDni = dni.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanName = candidateName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);

  return `${cleanDni}_${cleanName}_CV${validExt}`;
}

/**
 * Convierte un File / Blob a base64 Data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Sube automáticamente el archivo CV de un candidato a la cuenta corporativa de Google Drive
 */
export async function uploadCvToGoogleDrive(params: UploadCvParams): Promise<UploadCvResult> {
  const safeFilename = generateSafeCvFilename(params.file.name, params.candidateDni, params.candidateName);

  try {
    const base64Data = await fileToBase64(params.file);

    const response = await fetch('/api/drive/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: safeFilename,
        mimeType: params.file.type || 'application/pdf',
        folderUrl: params.folderUrl || null,
        vacancyTitle: params.vacancyTitle || null,
        base64: base64Data
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.webViewLink) {
      return {
        success: true,
        linkCv: data.webViewLink,
        isDriveLink: true,
        fileId: data.fileId,
        filename: safeFilename
      };
    }

    throw new Error(data.error || 'Respuesta no válida del servidor de Google Drive');
  } catch (err: any) {
    console.warn('[Google Drive Upload Fallback]:', err?.message || err);
    // Fallback elegante en caso de contingencia o modo offline: registrar referencia segura
    const destination = params.vacancyTitle ? `2026_${params.vacancyTitle.replace(/\s+/g, '_')}` : 'General_2026';
    const fallbackLink = `[Expediente: ${destination}] / ${safeFilename}`;

    return {
      success: false,
      linkCv: fallbackLink,
      isDriveLink: false,
      filename: safeFilename,
      error: err?.message || String(err)
    };
  }
}

/**
 * Comprueba el estado de la conexión con Google Drive
 */
export async function checkDriveStatus(): Promise<{ connected: boolean; user?: { emailAddress: string; displayName: string }; error?: string }> {
  try {
    const res = await fetch('/api/drive/status');
    if (!res.ok) return { connected: false };
    return await res.json();
  } catch {
    return { connected: false };
  }
}

/**
 * Determina si un enlace es una URL real de Google Drive
 */
export function isGoogleDriveLink(link: string | null | undefined): boolean {
  if (!link || typeof link !== 'string') return false;
  return link.includes('drive.google.com') || link.includes('docs.google.com');
}

/**
 * Las 12 columnas fijas base (A a L) para procesos 2026
 */
export const VACANCY_BASE_COLUMNS = [
  'Fecha',
  'Nombre',
  'DNI',
  'Teléfono',
  'Edad',
  'Actual o última posición',
  'Sector / Rubro',
  'Años de experiencia',
  'Salario actual o último salario',
  'Inglés avanzado',
  'Maestría',
  'Tipo de empresa'
];

/**
 * Construye los encabezados completos del Google Sheet del Puesto:
 * 12 columnas base + Preguntas personalizadas + 'Link del CV'
 */
export function buildVacancyHeaders(customQuestions?: { label: string }[]): string[] {
  const customLabels = (customQuestions || [])
    .map((q) => (q.label || '').trim())
    .filter(Boolean);
  return [...VACANCY_BASE_COLUMNS, ...customLabels, 'Link del CV'];
}

export interface CreateSheetClientParams {
  vacancyTitle: string;
  jobFolderUrl?: string;
  headers: string[];
}

export interface CreateSheetClientResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  name?: string;
  error?: string;
}

/**
 * Solicita la creación de un Google Sheet en la carpeta del Job asignada
 */
export async function createGoogleSheetForVacancy(params: CreateSheetClientParams): Promise<CreateSheetClientResult> {
  try {
    const res = await fetch('/api/drive/create-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vacancyTitle: params.vacancyTitle,
        jobFolderUrl: params.jobFolderUrl || null,
        headers: params.headers
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Error ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      fileId: data.fileId,
      webViewLink: data.webViewLink,
      name: data.name
    };
  } catch (err: any) {
    console.warn('[Create Google Sheet Error]:', err);
    return {
      success: false,
      error: err?.message || String(err)
    };
  }
}

export interface SyncSheetClientParams {
  fileId: string;
  base64: string;
}

export interface SyncSheetClientResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

/**
 * Sincroniza un Google Sheet existente en Drive enviando el binario XLSX generado
 */
export async function syncGoogleSheetWithBinary(params: SyncSheetClientParams): Promise<SyncSheetClientResult> {
  try {
    const res = await fetch('/api/drive/sync-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: params.fileId,
        base64: params.base64
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Error ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      fileId: data.fileId,
      webViewLink: data.webViewLink
    };
  } catch (err: any) {
    console.warn('[Sync Google Sheet Error]:', err);
    return {
      success: false,
      error: err?.message || String(err)
    };
  }
}
