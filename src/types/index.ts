// ============================================================================
// MODELOS Y DEFINICIONES DE TIPOS DEL SISTEMA ATS
// ============================================================================

export type ModalityType = 'Presencial' | 'Híbrido' | 'Remoto';
export type VacancyStatus = 'active' | 'paused' | 'closed';

export type ApplicationStatus =
  | 'recibido'
  | 'revision'
  | 'en_revision'
  | 'entrevista'
  | 'terna'
  | 'shortlist'
  | 'seleccionado'
  | 'contratado'
  | 'descartado';

export type CustomQuestionType =
  | 'text'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'boolean_with_details';

export interface CustomQuestion {
  id: string;
  label: string;
  type: CustomQuestionType;
  options?: string[];
  required: boolean;
  specifyPlaceholder?: string;
}

// ----------------------------------------------------------------------------
// A. BASE HISTÓRICA (SOLO LECTURA) - 23 COLUMNAS EXACTAS (A a la W)
// ----------------------------------------------------------------------------
export type HistoricalCandidate = HistoricalCandidate8k;
export interface HistoricalCandidate8k {
  id: string;
  nombre: string;                             // Col A
  genero: string;                             // Col B
  edad: number | null;                        // Col C
  numeroTelefonico: string;                   // Col D (con link directo a WhatsApp)
  correo: string;                             // Col E
  linkedin: string;                           // Col F (enlace clicable)
  carreraPregrado: string;                    // Col G
  universidadPregrado: string;                // Col H
  maestria: string;                           // Col I
  casaEstudioMaestria: string;                // Col J
  especializacionesDiplomados: string;        // Col K
  casaEstudioEspecializaciones: string;       // Col L
  sueldoEstimacionSoles: number | null;       // Col M [mensuales & soles]
  lineaEspecializacion: string;               // Col N
  area: string;                               // Col O
  aniosExperiencia: number | null;            // Col P
  ultimaPosicion: string;                     // Col Q
  fechaUltimaPosicion: string;                // Col R
  nivelIngles: string;                        // Col S
  ultimaEmpresa: string;                      // Col T
  numTrabajadoresUltimaEmpresa: string;       // Col U
  facturacion2024Dolares: string;             // Col V
  linkCv: string;                             // Col W (botón clicable)
}

// ----------------------------------------------------------------------------
// B. PROCESOS Y BASE ACTUALIZADA (2026 EN ADELANTE)
// ----------------------------------------------------------------------------

// 12 Columnas Fijas Base (A a L) + Custom + Link CV
export interface Candidate2026 {
  id: string;
  fecha: string;                              // Col A: Fecha
  nombre: string;                             // Col B: Nombre
  dni: string;                                // Col C: DNI (Identificador Único)
  telefono: string;                           // Col D: Teléfono
  correo: string;                             // Correo Electrónico (Para automatizaciones y CRM Zoho Bigin)
  edad: number | string;                      // Col E: Edad
  actualUltimaPosicion: string;               // Col F: Actual o última posición
  sectorRubro: string;                        // Col G: Sector / Rubro
  aniosExperiencia: number | string;          // Col H: Años de experiencia (número o rango)
  salarioActualUltimo: number | string;       // Col I: Salario actual o último salario (número o rango)
  inglesAvanzado: 'Sí' | 'No' | string;       // Col J: ¿Inglés Avanzado? (Sí / No)
  maestria: string;                           // Col K: Maestría (texto libre o Sí/No con detalle)
  tipoEmpresa: string;                        // Col L: Tipo de empresa
  linkCv: string;                             // Col Final: Link del CV
  customAnswers?: Record<string, any>;        // Columnas adicionales/personalizadas
  createdAt: string;
  updatedAt?: string;
}

export interface Vacancy2026 {
  id: string;
  code: string;                               // Ej: ATS-2026-01
  title: string;
  status: VacancyStatus;                      // active, paused, closed (Cerrado/Histórico 2026)
  sector: string;
  location: string;
  modality: ModalityType;
  salaryBudgetMin?: number;
  salaryBudgetMax?: number;
  description: string;
  requirements: string[];
  responsibilities?: string[];

  // GESTIÓN DE CARPETAS DE GOOGLE DRIVE POR PUESTO
  folderName: string;                         // Nombre de Carpeta (ej: 2026_Gerente_Comercial)
  jobFolderUrl?: string;                      // URL de Carpeta / Perfil del Job en Google Drive
  cvsFolderUrl?: string;                      // URL de Carpeta de CVs en Google Drive
  driveFolderUrl?: string;                    // URL de Carpeta de CVs (compatibilidad)

  // GESTIÓN DE GOOGLE SHEETS (OAUTH2 CORPORATIVO)
  googleSheetFileId?: string;                 // ID devuelto por Google Drive al crear el Sheet
  googleSheetUrl?: string;                    // webViewLink directo al Sheet oficial
  isImportedHistorical?: boolean;             // true si fue importado por CSV (prohibido duplicar/crear en Drive)

  // INTEGRACIÓN CON ZOHO BIGIN CRM
  biginSubPipelineName?: string;              // Nombre de la hoja/sub-pipeline asignada en Bigin
  biginPipelineName?: string;                 // Nombre del Pipeline principal de Bigin (ej: Jobs, Reclutamiento)
  biginStages?: string[];                     // Fases dinámicas detectadas en el pipeline para la empresa

  // Preguntas dinámicas (detectadas de columnas CSV M-Q o agregadas en admin)
  customQuestions: CustomQuestion[];
  isImportedCsv?: boolean;
  createdAt: string;
  closedAt?: string;
}

export interface Application2026 {
  id: string;
  vacancyId: string;                          // ID de la vacante o 'SPONTANEOUS'
  candidateDni: string;                       // Relación única por DNI
  appliedAt: string;
  status: ApplicationStatus;
  biginStage?: string;                        // Etapa real sincronizada desde Zoho Bigin (ej: "Preseleccionados", "Evaluación de candidatos", "Proceso de entrevista", "Ofertado", "Contratado", "Rechazado")
  biginDealId?: string;                       // ID del trato en Bigin
  customAnswers: Record<string, any>;         // Respuestas a preguntas intermedias M-Q
  linkCv: string;
  recruiterNotes?: string;
  privacyConsent?: boolean;                   // Consentimiento legal obligatorio Ley de Protección de Datos
  consentTimestamp?: string;
}

// ----------------------------------------------------------------------------
// C. USUARIOS AUTORIZADOS Y SEGURIDAD ADMIN
// ----------------------------------------------------------------------------
export type AdminUserRole = 'SuperAdmin' | 'Consultor Senior' | 'Reclutador' | 'Viewer' | 'client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password: string;                           // Almacenada como Hash SHA-256 con Salt único
  role: AdminUserRole;
  active: boolean;
  companyName?: string;                       // Nombre de la Empresa (ej. "Alicorp")
  assignedVacancyIds?: string[];              // IDs de las vacantes que esta empresa puede visualizar
  createdAt: string;
}

// ----------------------------------------------------------------------------
// D. REGISTRO DE AUDITORÍA INMUTABLE (AUDIT LOGS)
// ----------------------------------------------------------------------------
export type AuditLogAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'EXPORT_EXCEL_8K'
  | 'EXPORT_EXCEL_VACANCY'
  | 'EXPORT_EXCEL_CANDIDATES'
  | 'IMPORT_CSV_VACANCY'
  | 'DELETE_VACANCY'
  | 'CREATE_USER'
  | 'DELETE_USER'
  | 'FORMAT_DATABASE';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditLogAction;
  details: string;
}
