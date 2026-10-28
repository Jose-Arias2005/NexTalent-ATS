// Storage Manager reactivo con caché en memoria + IndexedDB y blindaje de seguridad

import { idb, STORES } from './idb';
import {
  HistoricalCandidate8k,
  Vacancy2026,
  Candidate2026,
  Application2026,
  AdminUser,
  VacancyStatus,
  ApplicationStatus,
  AuditLogEntry,
  AuditLogAction
} from '../types';
import { DEFAULT_SUPERADMIN } from './mockData';
import {
  hashPassword,
  verifyPassword,
  getLoginThrottleStatus,
  recordFailedLoginAttempt,
  resetLoginThrottle,
  createSignedSession,
  verifySignedSession,
  hasPermission,
  sanitizeInputText,
  generateSecureRandomId
} from './security';

class StorageManager {
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  // Memoria Caché de Alto Rendimiento (Latencia 0ms para búsquedas y filtros)
  private cacheHistorical8k: HistoricalCandidate8k[] = [];
  private cacheVacancies2026: Vacancy2026[] = [];
  private cacheCandidates2026: Candidate2026[] = [];
  private cacheApplications2026: Application2026[] = [];
  private cacheAdminUsers: AdminUser[] = [];
  private cacheAuditLogs: AuditLogEntry[] = [];
  private currentUser: AdminUser | null = null;

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const [historical, vacancies, candidates, applications, users, session, logs] =
          await Promise.all([
            idb.getAll<HistoricalCandidate8k>(STORES.HISTORICAL_8K),
            idb.getAll<Vacancy2026>(STORES.VACANCIES_2026),
            idb.getAll<Candidate2026>(STORES.CANDIDATES_2026),
            idb.getAll<Application2026>(STORES.APPLICATIONS_2026),
            idb.getAll<AdminUser>(STORES.ADMIN_USERS),
            idb.get<any>(STORES.CONFIG, 'session'),
            idb.getAll<AuditLogEntry>(STORES.AUDIT_LOGS)
          ]);

        this.cacheHistorical8k = historical || [];
        this.cacheVacancies2026 = vacancies || [];
        this.cacheCandidates2026 = candidates || [];
        this.cacheApplications2026 = applications || [];
        this.cacheAuditLogs = (logs || []).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Asegurar usuario SuperAdmin inicial con contraseña hasheada
        if (!users || users.length === 0) {
          const hashedPassword = await hashPassword(DEFAULT_SUPERADMIN.password);
          const initialSuperAdmin: AdminUser = {
            ...DEFAULT_SUPERADMIN,
            password: hashedPassword
          };
          await idb.put(STORES.ADMIN_USERS, initialSuperAdmin);
          this.cacheAdminUsers = [initialSuperAdmin];
        } else {
          // Migración transparente: Si algún usuario tiene contraseña en texto plano, hashearla de inmediato
          const upgradedUsers: AdminUser[] = [];
          for (const u of users) {
            if (!u.password.includes(':')) {
              const hashed = await hashPassword(u.password);
              const upgraded = { ...u, password: hashed };
              await idb.put(STORES.ADMIN_USERS, upgraded);
              upgradedUsers.push(upgraded);
            } else {
              upgradedUsers.push(u);
            }
          }
          this.cacheAdminUsers = upgradedUsers;
        }

        // Validación criptográfica y de expiración de sesión (Session Hardening)
        if (session && session.user) {
          const isSessionValid = await verifySignedSession(session);
          if (isSessionValid) {
            const validUser = this.cacheAdminUsers.find(
              (u) => u.id === session.user.id && u.active
            );
            this.currentUser = validUser || null;
          } else {
            // Sesión expirada o manipulada en DevTools: invalidar de inmediato
            this.currentUser = null;
            await idb.delete(STORES.CONFIG, 'session');
          }
        }

        this.isInitialized = true;
        this.notify();
      } catch (err) {
        console.error('Error inicializando Storage con IndexedDB:', err);
      }
    })();

    return this.initPromise;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // ==========================================================================
  // REGISTRO DE AUDITORÍA INMUTABLE (AUDIT LOGS)
  // ==========================================================================
  public getAuditLogs(): AuditLogEntry[] {
    return [...this.cacheAuditLogs];
  }

  public async logAudit(action: AuditLogAction, details: string): Promise<void> {
    try {
      const entry: AuditLogEntry = {
        id: `log-${Date.now()}-${generateSecureRandomId(6)}`,
        timestamp: new Date().toISOString(),
        userId: this.currentUser?.id || 'ANONYMOUS',
        userName: this.currentUser?.name || 'Sistema / Público',
        userRole: this.currentUser?.role || 'Guest',
        action,
        details: sanitizeInputText(details)
      };

      this.cacheAuditLogs = [entry, ...this.cacheAuditLogs];
      await idb.put(STORES.AUDIT_LOGS, entry);
      this.notify();
    } catch (err) {
      console.warn('No se pudo registrar log de auditoría:', err);
    }
  }

  // ==========================================================================
  // A. BASE HISTÓRICA (SOLO LECTURA)
  // ==========================================================================
  public getHistorical8k(): HistoricalCandidate8k[] {
    return [...this.cacheHistorical8k];
  }

  public async importHistorical8kBatch(items: HistoricalCandidate8k[]): Promise<number> {
    await this.init();
    await idb.bulkPut(STORES.HISTORICAL_8K, items);
    this.cacheHistorical8k = await idb.getAll<HistoricalCandidate8k>(STORES.HISTORICAL_8K);
    await this.logAudit('IMPORT_CSV_VACANCY', `Importación de ${items.length} registros a la Base Histórica.`);
    this.notify();
    return items.length;
  }

  public async clearHistorical8k(): Promise<void> {
    if (!hasPermission(this.currentUser?.role, 'format_db')) {
      throw new Error('Acceso denegado: solo SuperAdmin puede vaciar la base histórica.');
    }
    await idb.clearStore(STORES.HISTORICAL_8K);
    this.cacheHistorical8k = [];
    await this.logAudit('FORMAT_DATABASE', 'Vaciado de la Base Histórica.');
    this.notify();
  }

  // ==========================================================================
  // B. VACANTES 2026+ (ACTUALES E HISTÓRICAS DEL AÑO)
  // ==========================================================================
  public getVacancies2026(): Vacancy2026[] {
    return [...this.cacheVacancies2026];
  }

  public getVacancyById(id: string): Vacancy2026 | undefined {
    return this.cacheVacancies2026.find((v) => v.id === id);
  }

  public async saveVacancy2026(vacancy: Vacancy2026): Promise<void> {
    await this.init();
    await idb.put(STORES.VACANCIES_2026, vacancy);
    const index = this.cacheVacancies2026.findIndex((v) => v.id === vacancy.id);
    if (index >= 0) {
      const next = [...this.cacheVacancies2026];
      next[index] = vacancy;
      this.cacheVacancies2026 = next;
    } else {
      this.cacheVacancies2026 = [vacancy, ...this.cacheVacancies2026];
    }
    this.notify();
  }

  public async updateVacancyStatus(id: string, status: VacancyStatus): Promise<void> {
    const vac = this.getVacancyById(id);
    if (!vac) return;
    const updated: Vacancy2026 = {
      ...vac,
      status,
      closedAt: status === 'closed' ? new Date().toISOString() : undefined
    };
    await this.saveVacancy2026(updated);
  }

  public async deleteVacancy2026(id: string): Promise<void> {
    if (!hasPermission(this.currentUser?.role, 'delete_vacancy')) {
      throw new Error('Acceso denegado: permisos insuficientes para eliminar vacantes.');
    }
    const vac = this.getVacancyById(id);
    await idb.delete(STORES.VACANCIES_2026, id);
    this.cacheVacancies2026 = this.cacheVacancies2026.filter((v) => v.id !== id);
    await this.logAudit(
      'DELETE_VACANCY',
      `Eliminación de la vacante: "${vac?.title || id}" (Código: ${vac?.code || id})`
    );
    this.notify();
  }

  // ==========================================================================
  // C. CANDIDATOS Y POSTULACIONES 2026+ (UNIFICADOS POR DNI)
  // ==========================================================================
  public getCandidates2026(): Candidate2026[] {
    return [...this.cacheCandidates2026];
  }

  public getCandidateByDni(dni: string): Candidate2026 | undefined {
    const cleaned = dni.trim().toUpperCase();
    return this.cacheCandidates2026.find((c) => c.dni.trim().toUpperCase() === cleaned);
  }

  public async saveCandidate2026(candidate: Candidate2026): Promise<void> {
    await this.init();
    await idb.put(STORES.CANDIDATES_2026, candidate);
    const index = this.cacheCandidates2026.findIndex(
      (c) => c.dni.trim().toUpperCase() === candidate.dni.trim().toUpperCase()
    );
    if (index >= 0) {
      const next = [...this.cacheCandidates2026];
      next[index] = candidate;
      this.cacheCandidates2026 = next;
    } else {
      this.cacheCandidates2026 = [candidate, ...this.cacheCandidates2026];
    }
    this.notify();
  }

  public getApplications2026(): Application2026[] {
    return [...this.cacheApplications2026];
  }

  public getApplicationsByVacancy(vacancyId: string): Application2026[] {
    return this.cacheApplications2026.filter((a) => a.vacancyId === vacancyId);
  }

  public getApplicationsByCandidateDni(dni: string): Application2026[] {
    const cleaned = dni.trim().toUpperCase();
    return this.cacheApplications2026.filter((a) => a.candidateDni.trim().toUpperCase() === cleaned);
  }

  public async saveApplication2026(app: Application2026): Promise<void> {
    await this.init();
    await idb.put(STORES.APPLICATIONS_2026, app);
    const index = this.cacheApplications2026.findIndex((a) => a.id === app.id);
    if (index >= 0) {
      const next = [...this.cacheApplications2026];
      next[index] = app;
      this.cacheApplications2026 = next;
    } else {
      this.cacheApplications2026 = [app, ...this.cacheApplications2026];
    }
    this.notify();
  }

  public async updateApplicationStatus(id: string, status: ApplicationStatus): Promise<void> {
    await this.init();
    const app = this.cacheApplications2026.find((a) => a.id === id);
    if (!app) return;
    const updated: Application2026 = {
      ...app,
      status
    };
    await this.saveApplication2026(updated);
  }

  // Registro de postulación web sanitizado y protegido
  public async submitWeb2026Application(
    data: Omit<Candidate2026, 'id' | 'createdAt'>,
    vacancyId: string,
    customAnswers?: Record<string, any>,
    privacyConsent = true
  ): Promise<{ candidate: Candidate2026; application: Application2026 }> {
    await this.init();

    // Sanitización exhaustiva de campos ingresados por el usuario
    const cleanDni = sanitizeInputText(data.dni).toUpperCase();
    const cleanNombre = sanitizeInputText(data.nombre);
    const cleanTelefono = sanitizeInputText(data.telefono);
    const cleanCorreo = sanitizeInputText(data.correo || '').toLowerCase().trim();
    const cleanActualPos = sanitizeInputText(data.actualUltimaPosicion);
    const cleanSector = sanitizeInputText(data.sectorRubro);
    const cleanMaestria = sanitizeInputText(data.maestria);
    const cleanTipoEmpresa = sanitizeInputText(data.tipoEmpresa);

    const existing = this.getCandidateByDni(cleanDni);
    const now = new Date().toISOString();

    const candidate: Candidate2026 = {
      ...(existing || {}),
      ...data,
      nombre: cleanNombre,
      dni: cleanDni,
      telefono: cleanTelefono,
      correo: cleanCorreo || (existing?.correo || ''),
      actualUltimaPosicion: cleanActualPos,
      sectorRubro: cleanSector,
      maestria: cleanMaestria,
      tipoEmpresa: cleanTipoEmpresa,
      id: existing ? existing.id : `cand-2026-${Date.now()}`,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    await this.saveCandidate2026(candidate);

    // Sanitizar respuestas de preguntas personalizadas
    const cleanAnswers: Record<string, any> = {};
    if (customAnswers) {
      for (const [k, v] of Object.entries(customAnswers)) {
        cleanAnswers[k] = typeof v === 'string' ? sanitizeInputText(v) : v;
      }
    }

    const app: Application2026 = {
      id: `app-2026-${Date.now()}`,
      vacancyId: vacancyId || 'SPONTANEOUS',
      candidateDni: candidate.dni,
      appliedAt: now,
      status: 'recibido',
      customAnswers: cleanAnswers,
      linkCv: data.linkCv || '',
      privacyConsent,
      consentTimestamp: now
    };

    await this.saveApplication2026(app);
    return { candidate, application: app };
  }

  // IMPORTADOR INTELIGENTE DE PUESTOS 2026 (Requisito 3)
  public async import2026ProcessFromCsv(
    vacancy: Vacancy2026,
    candidates: Candidate2026[],
    applications: Application2026[]
  ): Promise<{ vacancy: Vacancy2026; importedCount: number }> {
    await this.init();

    if (!hasPermission(this.currentUser?.role, 'import_csv')) {
      throw new Error('Acceso denegado: permisos insuficientes para importar procesos desde CSV.');
    }

    // Guardar la vacante creada
    await this.saveVacancy2026(vacancy);

    // Guardar candidatos por lotes
    await idb.bulkPut(STORES.CANDIDATES_2026, candidates);
    // Guardar postulaciones vinculadas a la vacante
    await idb.bulkPut(STORES.APPLICATIONS_2026, applications);

    // Refrescar caché
    this.cacheCandidates2026 = await idb.getAll<Candidate2026>(STORES.CANDIDATES_2026);
    this.cacheApplications2026 = await idb.getAll<Application2026>(STORES.APPLICATIONS_2026);

    await this.logAudit(
      'IMPORT_CSV_VACANCY',
      `Importación del proceso "${vacancy.title}" (${vacancy.code}) con ${candidates.length} candidatos.`
    );

    this.notify();
    return { vacancy, importedCount: candidates.length };
  }

  // ==========================================================================
  // D. EQUIPO AUTORIZADO Y SEGURIDAD ADMIN (RBAC + HASHING)
  // ==========================================================================
  public getAdminUsers(): AdminUser[] {
    return [...this.cacheAdminUsers];
  }

  public async saveAdminUser(user: AdminUser): Promise<void> {
    await this.init();

    if (!hasPermission(this.currentUser?.role, 'manage_users')) {
      throw new Error('Acceso denegado: solo SuperAdmin puede crear o editar usuarios.');
    }

    // Hashear la contraseña si viene en texto plano
    let safeUser = { ...user };
    if (!safeUser.password.includes(':')) {
      safeUser.password = await hashPassword(safeUser.password);
    }

    await idb.put(STORES.ADMIN_USERS, safeUser);
    const index = this.cacheAdminUsers.findIndex((u) => u.id === safeUser.id);
    if (index >= 0) {
      const next = [...this.cacheAdminUsers];
      next[index] = safeUser;
      this.cacheAdminUsers = next;
    } else {
      this.cacheAdminUsers = [...this.cacheAdminUsers, safeUser];
    }

    await this.logAudit(
      'CREATE_USER',
      `Usuario ${safeUser.name} (${safeUser.email}) registrado/actualizado con rol ${safeUser.role}.`
    );

    this.notify();
  }

  public async deleteAdminUser(id: string): Promise<void> {
    if (!hasPermission(this.currentUser?.role, 'manage_users')) {
      throw new Error('Acceso denegado: solo SuperAdmin puede revocar accesos.');
    }
    if (this.currentUser?.id === id) {
      throw new Error('No puedes eliminar tu propio usuario en sesión activa.');
    }

    const targetUser = this.cacheAdminUsers.find((u) => u.id === id);
    await idb.delete(STORES.ADMIN_USERS, id);
    this.cacheAdminUsers = this.cacheAdminUsers.filter((u) => u.id !== id);

    await this.logAudit(
      'DELETE_USER',
      `Acceso revocado a: ${targetUser?.name || id} (${targetUser?.email || ''}).`
    );

    this.notify();
  }

  public getCurrentUser(): AdminUser | null {
    return this.currentUser;
  }

  // Autenticación blindada con Rate Limiting y Hashes Criptográficos
  public async login(email: string, pass: string): Promise<AdminUser | null> {
    await this.init();

    // 1. Verificar bloqueo por fuerza bruta
    const throttle = getLoginThrottleStatus();
    if (throttle.isLocked) {
      const mins = Math.floor(throttle.remainingSeconds / 60);
      const secs = throttle.remainingSeconds % 60;
      const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;
      throw new Error(
        `Acceso bloqueado por seguridad debido a múltiples intentos fallidos. Intenta nuevamente en ${formattedTime} min.`
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = this.cacheAdminUsers.find(
      (u) => u.email.trim().toLowerCase() === cleanEmail && u.active
    );

    if (!user) {
      recordFailedLoginAttempt();
      await this.logAudit('LOGIN_FAILED', `Intento de acceso fallido: cuenta inexistente o inactiva (${cleanEmail}).`);
      return null;
    }

    const isValid = await verifyPassword(pass, user.password);

    if (isValid) {
      resetLoginThrottle();

      // Si la contraseña estaba en texto plano legacy, actualizarla a hash
      if (!user.password.includes(':')) {
        user.password = await hashPassword(pass);
        await idb.put(STORES.ADMIN_USERS, user);
      }

      this.currentUser = user;

      // Crear sesión firmada criptográficamente con expiración
      const sessionData = await createSignedSession({
        id: user.id,
        email: user.email,
        role: user.role
      });

      await idb.put(STORES.CONFIG, sessionData);
      await this.logAudit('LOGIN_SUCCESS', `Inicio de sesión exitoso de ${user.name} (${user.email}).`);

      this.notify();
      return user;
    }

    // Contraseña incorrecta
    const postThrottle = recordFailedLoginAttempt();
    await this.logAudit('LOGIN_FAILED', `Intento fallido de contraseña para: ${cleanEmail}.`);

    if (postThrottle.isLocked) {
      throw new Error(
        'Has excedido el máximo de 5 intentos permitidos. El formulario ha sido bloqueado temporalmente por 3 minutos.'
      );
    }

    return null;
  }

  public async logout(): Promise<void> {
    if (this.currentUser) {
      await this.logAudit('LOGOUT', `Cierre de sesión voluntario de ${this.currentUser.name}.`);
    }
    this.currentUser = null;
    await idb.delete(STORES.CONFIG, 'session');
    this.notify();
  }

  // ==========================================================================
  // E. FORMATEAR / LIMPIAR BASE DE DATOS (SEGURIDAD SUPERADMIN)
  // ==========================================================================
  public async formatDatabase(): Promise<void> {
    if (!hasPermission(this.currentUser?.role, 'format_db')) {
      throw new Error('Acceso denegado: solo SuperAdmin puede formatear la base de datos.');
    }

    await idb.wipeAll();

    // Restablecer SuperAdmin inicial con contraseña hasheada
    const hashedPass = await hashPassword(DEFAULT_SUPERADMIN.password);
    const initialAdmin: AdminUser = {
      ...DEFAULT_SUPERADMIN,
      password: hashedPass
    };

    await idb.put(STORES.ADMIN_USERS, initialAdmin);

    this.cacheHistorical8k = [];
    this.cacheVacancies2026 = [];
    this.cacheCandidates2026 = [];
    this.cacheApplications2026 = [];
    this.cacheAdminUsers = [initialAdmin];
    this.cacheAuditLogs = [];
    this.currentUser = initialAdmin;

    const sessionData = await createSignedSession({
      id: initialAdmin.id,
      email: initialAdmin.email,
      role: initialAdmin.role
    });

    await idb.put(STORES.CONFIG, sessionData);
    await this.logAudit('FORMAT_DATABASE', 'Formateo y reseteo completo de base de datos a estado cero.');
    this.notify();
  }
}

export const storage = new StorageManager();
