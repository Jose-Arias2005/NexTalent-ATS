import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const tokenPath = path.join(projectRoot, 'token.json');
const oauthPath = path.join(projectRoot, 'oauth_credentials.json');

// In-memory token cache
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

interface Credentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tokenUri: string;
}

/**
 * Loads credentials from token.json or oauth_credentials.json
 */
function loadCredentials(): Credentials {
  if (!fs.existsSync(tokenPath)) {
    throw new Error('No se encontró el archivo token.json en la raíz del proyecto.');
  }

  const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

  let clientId = tokenData.client_id;
  let clientSecret = tokenData.client_secret;

  // Fallback to oauth_credentials.json if needed
  if ((!clientId || !clientSecret) && fs.existsSync(oauthPath)) {
    try {
      const oauthData = JSON.parse(fs.readFileSync(oauthPath, 'utf8'));
      const installed = oauthData.installed || oauthData.web;
      if (installed) {
        clientId = clientId || installed.client_id;
        clientSecret = clientSecret || installed.client_secret;
      }
    } catch {
      // Ignore
    }
  }

  return {
    clientId,
    clientSecret,
    refreshToken: tokenData.refresh_token,
    tokenUri: tokenData.token_uri || 'https://oauth2.googleapis.com/token'
  };
}

/**
 * Obtains a fresh access token using the refresh token
 */
export async function getValidAccessToken(): Promise<string> {
  const now = Date.now();
  // Return cached token if valid for at least 60 seconds
  if (cachedAccessToken && tokenExpiresAt > now + 60000) {
    return cachedAccessToken;
  }

  const creds = loadCredentials();
  if (!creds.refreshToken) {
    throw new Error('El archivo token.json no contiene un refresh_token válido.');
  }

  const params = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: 'refresh_token'
  });

  const res = await fetch(creds.tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al refrescar token de Google OAuth (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as any;
  if (!data?.access_token) {
    throw new Error('Google OAuth no devolvió un access_token válido.');
  }

  cachedAccessToken = String(data.access_token);
  // Google tokens typically last 3600 seconds (1 hour)
  const expiresIn = Number(data.expires_in) || 3600;
  tokenExpiresAt = now + expiresIn * 1000;

  return cachedAccessToken;
}

/**
 * Extracts a Google Drive folder ID from a URL or raw ID
 */
export function extractFolderId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const clean = urlOrId.trim();
  if (!clean || clean === '#' || clean.startsWith('javascript:')) return null;

  // Pattern 1: /folders/([a-zA-Z0-9_-]+)
  const folderMatch = clean.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Pattern 2: id=([a-zA-Z0-9_-]+)
  const idParamMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Pattern 3: Raw ID string (alphanumeric, at least 15 chars, no slashes or spaces)
  if (/^[a-zA-Z0-9_-]{15,100}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Checks connectivity and returns Google Drive user information
 */
export async function getDriveStatus() {
  try {
    const accessToken = await getValidAccessToken();
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      return { connected: false, error: `Google API Error ${res.status}` };
    }
    const data = (await res.json()) as any;
    return {
      connected: true,
      user: data.user,
      storageQuota: data.storageQuota
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Finds or creates the default root folder for CVs
 */
let defaultRootFolderId: string | null = null;
export async function getOrCreateDefaultRootFolder(): Promise<string> {
  if (defaultRootFolderId) return defaultRootFolderId;

  const accessToken = await getValidAccessToken();
  const folderName = 'Talent ATS - CVs 2026';
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);

  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (listRes.ok) {
    const listData = (await listRes.json()) as any;
    if (listData?.files && listData.files.length > 0) {
      defaultRootFolderId = String(listData.files[0].id);
      return defaultRootFolderId;
    }
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    throw new Error(`No se pudo crear la carpeta raíz en Google Drive (${createRes.status})`);
  }

  const created = (await createRes.json()) as any;
  defaultRootFolderId = String(created.id);
  return defaultRootFolderId;
}

/**
 * Finds or creates a subfolder for a specific vacancy title inside a parent folder
 */
export async function getOrCreateVacancyFolder(vacancyTitle: string | null | undefined, parentFolderId?: string): Promise<string | undefined> {
  if (!vacancyTitle) return parentFolderId;
  const accessToken = await getValidAccessToken();

  const sanitizedTitle = vacancyTitle.replace(/['"\\]/g, '').trim().slice(0, 80);
  const folderName = `CVs - ${sanitizedTitle}`;
  const parentQuery = parentFolderId ? ` and '${parentFolderId}' in parents` : '';
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentQuery}`);

  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (listRes.ok) {
    const listData = (await listRes.json()) as any;
    if (listData?.files && listData.files.length > 0) {
      return String(listData.files[0].id);
    }
  }

  // Create subfolder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined
    })
  });

  if (createRes.ok) {
    const created = (await createRes.json()) as any;
    return String(created.id);
  }

  // If subfolder creation fails, fallback to parent
  return parentFolderId;
}

export interface UploadOptions {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
  folderUrl?: string | null;
  vacancyTitle?: string | null;
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  filename: string;
  webViewLink: string;
  folderId?: string | null;
}

/**
 * Uploads a file buffer directly to Google Drive
 */
export async function uploadFileToDrive({
  buffer,
  filename,
  mimeType = 'application/pdf',
  folderUrl = null,
  vacancyTitle = null
}: UploadOptions): Promise<UploadResult> {
  const accessToken = await getValidAccessToken();

  // Resolve target folder
  let targetFolderId = extractFolderId(folderUrl);

  // If no folder URL was configured for this vacancy, organize under default root folder
  if (!targetFolderId) {
    const rootId = await getOrCreateDefaultRootFolder();
    if (vacancyTitle && vacancyTitle !== 'SPONTANEOUS') {
      try {
        const subId = await getOrCreateVacancyFolder(vacancyTitle, rootId);
        targetFolderId = subId || rootId;
      } catch {
        targetFolderId = rootId;
      }
    } else {
      targetFolderId = rootId;
    }
  }

  const metadata: Record<string, any> = {
    name: filename,
    mimeType: mimeType
  };

  if (targetFolderId) {
    metadata.parents = [targetFolderId];
  }

  const boundary = `-------ATS${Date.now()}${Math.random().toString(36).slice(2)}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadataHeader =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    'Content-Transfer-Encoding: binary\r\n\r\n';

  const metadataBuffer = Buffer.from(metadataHeader, 'utf8');
  const closeDelimBuffer = Buffer.from(closeDelim, 'utf8');
  const multipartBody = Buffer.concat([metadataBuffer, buffer, closeDelimBuffer]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,parents',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length)
      },
      body: multipartBody
    }
  );

  if (!uploadRes.ok) {
    const errorBody = await uploadRes.text();
    throw new Error(`Google Drive Upload Error (${uploadRes.status}): ${errorBody}`);
  }

  const fileData = (await uploadRes.json()) as any;

  // Try to set public read permission so consultants can open the link directly
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch {
    // Non-fatal if permission cannot be modified
  }

  const webViewLink = fileData?.webViewLink || `https://drive.google.com/file/d/${fileData?.id}/view`;

  return {
    success: true,
    fileId: String(fileData.id),
    filename: String(fileData.name || filename),
    webViewLink: String(webViewLink),
    folderId: targetFolderId
  };
}

export interface CreateVacancySheetOptions {
  vacancyTitle: string;
  jobFolderUrl?: string | null;
  headers: string[];
}

export interface CreateVacancySheetResult {
  success: boolean;
  fileId: string;
  webViewLink: string;
  name: string;
  folderId?: string | null;
}

/**
 * Crea un archivo de Google Sheets en la carpeta del Job especificada,
 * con el nombre idéntico al título del puesto y la fila 1 de encabezados inicializada.
 */
export async function createVacancyGoogleSheet({
  vacancyTitle,
  jobFolderUrl = null,
  headers
}: CreateVacancySheetOptions): Promise<CreateVacancySheetResult> {
  const accessToken = await getValidAccessToken();

  // 1. Resolver carpeta destino (Carpeta del Job)
  let targetFolderId = extractFolderId(jobFolderUrl);
  if (!targetFolderId) {
    try {
      targetFolderId = await getOrCreateDefaultRootFolder();
    } catch {
      targetFolderId = null;
    }
  }

  // 2. Crear el archivo Google Sheets en Google Drive
  const metadata: Record<string, any> = {
    name: vacancyTitle.trim(),
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };

  if (targetFolderId) {
    metadata.parents = [targetFolderId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    throw new Error(`Error creando Google Sheet en Drive (${createRes.status}): ${errorBody}`);
  }

  const fileData = (await createRes.json()) as any;
  const fileId = String(fileData.id);

  // 3. Asignar permiso de lectura pública mediante enlace
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch {
    // Non-fatal
  }

  // 4. Inicializar Fila 1 de Encabezados vía Google Sheets API v4
  if (headers && headers.length > 0) {
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: 'A1',
            majorDimension: 'ROWS',
            values: [headers]
          })
        }
      );
    } catch (headErr) {
      console.warn('[Google Sheets Header Init Warning]:', headErr);
    }
  }

  const webViewLink = fileData?.webViewLink || `https://docs.google.com/spreadsheets/d/${fileId}/edit`;

  return {
    success: true,
    fileId,
    webViewLink,
    name: String(fileData.name || vacancyTitle),
    folderId: targetFolderId
  };
}

export interface PatchSheetOptions {
  fileId: string;
  buffer: Buffer;
}

/**
 * Actualiza el contenido de un Google Sheet existente en Drive usando el binario XLSX sanitizado
 */
export async function patchSheetWithXlsxBuffer({ fileId, buffer }: PatchSheetOptions): Promise<{ success: boolean; fileId: string; webViewLink: string }> {
  const accessToken = await getValidAccessToken();

  const patchRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      body: buffer
    }
  );

  if (!patchRes.ok) {
    const errorBody = await patchRes.text();
    throw new Error(`Error actualizando Google Sheet (${patchRes.status}): ${errorBody}`);
  }

  // Asegurar permiso de lectura
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    fileId,
    webViewLink: `https://docs.google.com/spreadsheets/d/${fileId}/edit`
  };
}
