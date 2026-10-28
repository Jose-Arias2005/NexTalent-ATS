// ============================================================================
// MÓDULO TRANSVERSAL DE SEGURIDAD Y BLINDAJE INSTITUCIONAL
// ============================================================================

export type Permission =
  | 'format_db'
  | 'manage_users'
  | 'delete_vacancy'
  | 'create_vacancy'
  | 'edit_vacancy'
  | 'import_csv'
  | 'export_data'
  | 'view_audit_logs';

// ----------------------------------------------------------------------------
// 1. VALIDACIÓN BINARIA DE ARCHIVOS (MAGIC BYTES) Y ENDURECIMIENTO DE CVs
// ----------------------------------------------------------------------------

export const MAX_CV_FILE_SIZE = 5 * 1024 * 1024; // 5 MB estricto
export const ALLOWED_CV_EXTENSIONS = ['.pdf', '.docx'];

// Extensiones de alto riesgo prohibidas
const DANGEROUS_EXTENSIONS = [
  'exe', 'js', 'vbs', 'bat', 'cmd', 'sh', 'php', 'py', 'jar',
  'scr', 'html', 'htm', 'svg', 'dll', 'msi', 'com', 'pif', 'wsf'
];

/**
 * Valida los Magic Bytes reales de un archivo binario en memoria.
 * - PDF: 0x25 0x50 0x44 0x46 (%PDF)
 * - DOCX: 0x50 0x4B 0x03 0x04 (Cabecera ZIP PK estándar de OpenXML)
 */
export async function validateCvFile(
  file: File
): Promise<{ valid: boolean; error?: string; safeFilename?: string }> {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo.' };
  }

  // 1. Límite de tamaño (5MB)
  if (file.size > MAX_CV_FILE_SIZE) {
    return {
      valid: false,
      error: 'El archivo supera el límite de seguridad de 5 MB. Por favor sube una versión optimizada.'
    };
  }

  const filename = file.name.trim();
  const lowerName = filename.toLowerCase();

  // 2. Prohibición explícita de archivos .doc (Word 97-2003 con macros)
  if (lowerName.endsWith('.doc')) {
    return {
      valid: false,
      error:
        'Los archivos en formato .doc antiguo (Word 97-2003) no están permitidos por motivos de seguridad informática institucional. Por favor guarda tu documento en formato .pdf o .docx moderno.'
    };
  }

  // 3. Verificación de extensión permitida (.pdf o .docx)
  const isAllowedExt = ALLOWED_CV_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!isAllowedExt) {
    return {
      valid: false,
      error: 'Formato no permitido. Solo se aceptan documentos en formato PDF (.pdf) o Word (.docx).'
    };
  }

  // 4. Detección de dobles extensiones peligrosas (ej: curriculum.pdf.exe)
  const parts = lowerName.split('.');
  if (parts.length > 2) {
    for (let i = 1; i < parts.length - 1; i++) {
      if (DANGEROUS_EXTENSIONS.includes(parts[i])) {
        return {
          valid: false,
          error: 'Nombre de archivo potencialmente malicioso detectado (doble extensión).'
        };
      }
    }
  }

  // 5. Verificación de Magic Bytes mediante ArrayBuffer
  try {
    const slice = file.slice(0, 4);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 4) {
      return { valid: false, error: 'El archivo está dañado o vacío.' };
    }

    if (lowerName.endsWith('.pdf')) {
      // 0x25 0x50 0x44 0x46 -> %PDF
      const isPdf =
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46;

      if (!isPdf) {
        return {
          valid: false,
          error:
            'Firma binaria inválida: el contenido del archivo no corresponde a un documento PDF legítimo.'
        };
      }
    } else if (lowerName.endsWith('.docx')) {
      // 0x50 0x4B 0x03 0x04 -> PK.. (ZIP container)
      const isZip =
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x03 &&
        bytes[3] === 0x04;

      if (!isZip) {
        return {
          valid: false,
          error:
            'Firma binaria inválida: el contenido del archivo no corresponde a un documento Word (.docx) legítimo.'
        };
      }
    }
  } catch {
    return {
      valid: false,
      error: 'No se pudo leer la estructura binaria del archivo para verificación.'
    };
  }

  return { valid: true };
}

/**
 * Sanitiza el nombre del archivo para prevenir ataques de Path Traversal y genera
 * un identificador seguro y único.
 */
export function generateSafeCvFilename(originalName: string, dni: string): string {
  const cleanDni = dni.replace(/[^a-zA-Z0-9]/g, '').trim() || 'CANDIDATO';
  const ext = originalName.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
  const uuid = generateSecureRandomId();
  return `CV_${uuid}_${cleanDni}.${ext}`;
}

export function generateSecureRandomId(length = 8): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(length);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }
  return Math.random().toString(36).substring(2, 2 + length);
}

// ----------------------------------------------------------------------------
// 2. PROTECCIÓN CONTRA INYECCIÓN DE FÓRMULAS EN EXCEL (CSV / XLSX INJECTION)
// ----------------------------------------------------------------------------

const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r', '|'];

/**
 * Neutraliza ataques DDE / Formula Injection en Excel anteponiendo una comilla simple
 * si el valor inicia con caracteres de fórmula.
 */
export function sanitizeForSpreadsheet(value: unknown): string {
  if (value === null || value === undefined) return '';

  const str = String(value).trim();
  if (str.length === 0) return '';

  const firstChar = str.charAt(0);
  if (FORMULA_TRIGGERS.includes(firstChar)) {
    // Si empieza con un número negativo válido, no es fórmula
    if (firstChar === '-' && /^-\d+(\.\d+)?$/.test(str)) {
      return str;
    }
    // Anteponer comilla simple para forzar texto plano en Excel/Sheets
    return `'${str}`;
  }

  return str;
}

/**
 * Sanitiza recursivamente un objeto fila antes de exportarlo con SheetJS
 */
export function sanitizeRowForSpreadsheet<T extends Record<string, any>>(row: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === 'number' || typeof val === 'boolean') {
      sanitized[key] = val;
    } else {
      sanitized[key] = sanitizeForSpreadsheet(val);
    }
  }
  return sanitized as T;
}

// ----------------------------------------------------------------------------
// 3. SANITIZACIÓN XSS, PROTOCOLOS SEGUROS Y ANTI-TABNABBING
// ----------------------------------------------------------------------------

/**
 * Limpia etiquetas HTML potencialmente peligrosas e inyecciones de script en textos de entrada
 */
export function sanitizeInputText(input: string | null | undefined): string {
  if (!input) return '';

  let sanitized = String(input);

  // Eliminar scripts completos
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Eliminar etiquetas potencialmente peligrosas
  sanitized = sanitized.replace(/<\/?(iframe|object|embed|applet|meta|link|style|base)[^>]*>/gi, '');

  // Eliminar manejadores de eventos inline (onerror, onload, onclick, etc.)
  sanitized = sanitized.replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // Neutralizar pseudoprotocolos javascript: o data:
  sanitized = sanitized.replace(/javascript\s*:/gi, 'blocked:');
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, 'blocked:');

  return sanitized.trim();
}

/**
 * Validador estricto de enlaces externos.
 * Bloquea cualquier protocolo que no sea https:// o http:// (o wa.me para WhatsApp).
 */
export function safeExternalUrl(url: string | null | undefined): string {
  if (!url) return '#';

  const clean = url.trim();
  if (clean.length === 0) return '#';

  const lower = clean.toLowerCase();

  // Bloqueo explícito de protocolos maliciosos
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '#';
  }

  // Permitir protocolos seguros
  if (lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('mailto:')) {
    return clean;
  }

  // Si no tiene protocolo, asumir https:// si parece un dominio válido
  if (clean.includes('.') && !clean.includes(' ') && !clean.includes('<')) {
    return `https://${clean}`;
  }

  return '#';
}

// ----------------------------------------------------------------------------
// 4. CRIPTOGRAFÍA DE CONTRASEÑAS CON SALT ÚNICO (SHA-256)
// ----------------------------------------------------------------------------

/**
 * Genera un hash seguro SHA-256 con Salt único para la contraseña
 */
export async function hashPassword(password: string, customSaltHex?: string): Promise<string> {
  const saltHex = customSaltHex || generateSecureRandomId(16);

  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(saltHex + password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `${saltHex}:${hashHex}`;
    }
  } catch {
    // Continuar con fallback si subtle crypto no está disponible
  }

  // Fallback seguro nativo si window.crypto.subtle no está disponible
  const simpleHash = sha256Fallback(saltHex + password);
  return `${saltHex}:${simpleHash}`;
}

/**
 * Verifica si una contraseña coincide con el hash almacenado (con soporte para legacy)
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;

  // Si tiene formato salt:hash
  if (storedHash.includes(':')) {
    const [saltHex, expectedHash] = storedHash.split(':');
    const computed = await hashPassword(password, saltHex);
    const computedHash = computed.split(':')[1];
    return computedHash === expectedHash;
  }

  // Compatibilidad con cuentas previas en texto plano (se migrarán al loguear)
  return password.trim() === storedHash.trim();
}

/**
 * Algoritmo SHA-256 en TypeScript puro para entornos sin window.crypto.subtle
 */
function sha256Fallback(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let compositeClear = '\x80';
  while ((ascii.length + 1) % 64 !== 56) ascii += '\0';
  ascii += compositeClear;
  while ((ascii.length % 64) !== 56) ascii += '\0';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// ----------------------------------------------------------------------------
// 5. PROTECCIÓN CONTRA FUERZA BRUTA (RATE LIMITING DE LOGIN)
// ----------------------------------------------------------------------------

const LOGIN_THROTTLE_KEY = 'ats_sec_login_throttle_v1';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 3 * 60 * 1000; // 3 minutos

interface LoginThrottleData {
  failedAttempts: number;
  lockUntil: number;
}

export function getLoginThrottleStatus(): {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
} {
  try {
    const raw = localStorage.getItem(LOGIN_THROTTLE_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };

    const data: LoginThrottleData = JSON.parse(raw);
    const now = Date.now();

    if (data.lockUntil > now) {
      const remainingSeconds = Math.ceil((data.lockUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, failedAttempts: data.failedAttempts };
    }

    return { isLocked: false, remainingSeconds: 0, failedAttempts: data.failedAttempts };
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }
}

export function recordFailedLoginAttempt(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const raw = localStorage.getItem(LOGIN_THROTTLE_KEY);
    const data: LoginThrottleData = raw
      ? JSON.parse(raw)
      : { failedAttempts: 0, lockUntil: 0 };

    data.failedAttempts += 1;

    if (data.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      data.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(LOGIN_THROTTLE_KEY, JSON.stringify(data));
      return { isLocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
    }

    localStorage.setItem(LOGIN_THROTTLE_KEY, JSON.stringify(data));
    return { isLocked: false, remainingSeconds: 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0 };
  }
}

export function resetLoginThrottle(): void {
  try {
    localStorage.removeItem(LOGIN_THROTTLE_KEY);
  } catch {
    // Ignore
  }
}

// ----------------------------------------------------------------------------
// 6. RATE LIMITING DE POSTULACIONES Y DETECCIÓN ANTI-BOT
// ----------------------------------------------------------------------------

const APP_THROTTLE_KEY = 'ats_sec_app_throttle_v1';
const DNI_HISTORY_KEY = 'ats_sec_dni_history_v1';

export function checkApplicationRateLimit(): { allowed: boolean; error?: string } {
  try {
    const raw = localStorage.getItem(APP_THROTTLE_KEY);
    const now = Date.now();
    let timestamps: number[] = raw ? JSON.parse(raw) : [];

    // Limpiar marcas de tiempo de más de 5 minutos (300,000 ms)
    timestamps = timestamps.filter((t) => now - t < 5 * 60 * 1000);

    if (timestamps.length >= 3) {
      return {
        allowed: false,
        error:
          'Límite de seguridad alcanzado: no es posible enviar más de 3 postulaciones en 5 minutos. Por favor espera unos momentos.'
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export function recordApplicationSubmission(): void {
  try {
    const raw = localStorage.getItem(APP_THROTTLE_KEY);
    const now = Date.now();
    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps = timestamps.filter((t) => now - t < 5 * 60 * 1000);
    timestamps.push(now);
    localStorage.setItem(APP_THROTTLE_KEY, JSON.stringify(timestamps));
  } catch {
    // Ignore
  }
}

export function checkDuplicateDniApplication(vacancyId: string, dni: string): boolean {
  try {
    const raw = localStorage.getItem(DNI_HISTORY_KEY);
    if (!raw) return false;
    const history: Record<string, number> = JSON.parse(raw);
    const key = `${vacancyId}_${dni.trim().toLowerCase()}`;
    const lastTime = history[key];
    if (lastTime && Date.now() - lastTime < 24 * 60 * 60 * 1000) {
      return true; // Ya postuló a este puesto en las últimas 24 horas
    }
    return false;
  } catch {
    return false;
  }
}

export function recordDniApplication(vacancyId: string, dni: string): void {
  try {
    const raw = localStorage.getItem(DNI_HISTORY_KEY);
    const history: Record<string, number> = raw ? JSON.parse(raw) : {};
    const key = `${vacancyId}_${dni.trim().toLowerCase()}`;
    history[key] = Date.now();
    localStorage.setItem(DNI_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore
  }
}

// ----------------------------------------------------------------------------
// 7. FIRMA CRIPTOGRÁFICA DE SESIÓN Y EXPIRACIÓN
// ----------------------------------------------------------------------------

export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas
const SESSION_SECRET_SALT = 'ATS_TALENT_SECURITY_SALT_2026_EXECUTIVE';

export async function createSignedSession(user: { id: string; email: string; role: string }) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const signature = await hashPassword(
    `${user.id}|${user.email}|${user.role}|${expiresAt}`,
    SESSION_SECRET_SALT
  );

  return {
    key: 'session',
    user,
    expiresAt,
    signature
  };
}

export async function verifySignedSession(session: any): Promise<boolean> {
  if (!session || !session.user || !session.expiresAt || !session.signature) {
    return false;
  }

  // 1. Verificar tiempo de expiración
  if (Date.now() > session.expiresAt) {
    return false;
  }

  // 2. Verificar firma criptográfica (previene elevación de privilegios en DevTools)
  const expected = await hashPassword(
    `${session.user.id}|${session.user.email}|${session.user.role}|${session.expiresAt}`,
    SESSION_SECRET_SALT
  );

  return expected === session.signature;
}

// ----------------------------------------------------------------------------
// 8. CONTROL DE ACCESO BASADO EN ROLES (RBAC)
// ----------------------------------------------------------------------------

export function hasPermission(role: string | undefined, perm: Permission): boolean {
  if (!role) return false;
  const norm = role.toLowerCase().trim();

  // 1. SuperAdmin: Control Absoluto
  if (norm === 'superadmin') {
    return true;
  }

  // 2. Reclutador / Consultor Senior: Operación de vacantes y exportaciones
  if (norm === 'reclutador' || norm === 'consultor senior' || norm === 'recruiter') {
    return [
      'create_vacancy',
      'edit_vacancy',
      'import_csv',
      'export_data'
    ].includes(perm);
  }

  // 3. Viewer / Lector: Solo lectura y consulta
  if (norm === 'viewer' || norm === 'lector') {
    return false; // No tiene permisos de mutación ni exportación administrativa
  }

  return false;
}
