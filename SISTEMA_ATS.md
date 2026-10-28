# DOCUMENTACIÓN TÉCNICA Y OPERATIVA INTEGRAL
# NEXTALENT ATS — EXECUTIVE SEARCH & TALENT ACQUISITION PLATFORM
**Versión de Producción 2026** · *Arquitectura Modular de Alto Rendimiento*

---

## 1. RESUMEN EJECUTIVO Y VISIÓN DE LA PLATAFORMA

La plataforma web **NexTalent ATS** es un ecosistema integral de reclutamiento ejecutivo que reemplaza el uso de archivos Excel dispersos por una arquitectura web moderna, reactiva y centralizada. Combina:

1. **Landing Page Corporativa de Alta Gama (Swiss Grid & Tech Executive):** Diseñada bajo el estándar visual de firmas de consultoría estratégica y tecnología institucional. Combina Blanco Puro (`#FFFFFF`), Azul Obsidiana (`#0A1120`), Gris Piedra (`#F4F6F9`), cuadrículas estructurales (`1px solid #E2E8F0`), tipografía corporativa (`Plus Jakarta Sans`), toques editoriales (`Instrument Serif`) y coordenadas monospace (`JetBrains Mono`).
2. **Hero Asimétrico 60/40 & Consola "Talent Radar":** División arquitectónica de alto contraste: a la izquierda, propuesta de valor con métricas y búsqueda en tiempo real; a la derecha, consola en vivo conectada a los mandatos activos y benchmark sectorial.
3. **Job Board Público ("Executive Ledger") y Postulación en Vivo:** Convocatorias activas estructuradas en filas ejecutivas de alta precisión con códigos alfanuméricos (`ATS-2026-XX`), enlaces directos únicos (`?job=[id]`), carga binaria de CV (.pdf/.docx con magic bytes) y preguntas específicas del puesto.
4. **Pipeline ATS y Sincronización Zoho Bigin CRM:** Gestión en tiempo real del ciclo de vida de los postulantes, con actualización visual instantánea (0ms de latencia en memoria). Incluye selector dinámico de Pipelines de Bigin (sin restricción de nombre fijo), carga arrastrable de credenciales OAuth (`self_client.json`), generación automática de Refresh Token y botón de reseteo/desconexión limpia.
5. **Doble Motor de Datos Estrictamente Separado:**
   - **Base Histórica (Solo Lectura):** Repositorio inmutable de candidatos con 23 columnas exactas, motor de búsqueda ultrarrápido y enlaces directos a WhatsApp, LinkedIn y CVs.
   - **Procesos y Talentos 2026+ (Base Viva y Dinámica):** Deduplicada y unificada por **DNI**, basada en las 12 columnas base estándar del headhunting más preguntas personalizadas por vacante.
6. **Analítica Ejecutiva & Termómetro Salarial:** Visualización interactiva de tendencias de compensación, nivel de bilingüismo, distribución de maestrías/MBAs y procedencia corporativa.
7. **Portal de Auditoría para Empresas Clientes:** Espacio dedicado y autenticado para clientes contratantes con Tablero Kanban Adaptativo que refleja en vivo las fases reales configuradas en el Pipeline de Bigin (sin forzar fases fijas), acceso seguro a CVs en Google Drive y analíticas específicas del proceso.

---

## 2. ARQUITECTURA TÉCNICA Y STACK TECNOLÓGICO

```mermaid
graph TD
    User([Postulante / Visitante]) -->|Web Pública / Link Directo| PublicViews[Landing & Job Board]
    Recruiter([Equipo de Selección]) -->|Login Protegido #admin| AdminViews[Panel ATS & Analítica]
    
    subgraph Frontend [React 19 + TypeScript + Vite]
        PublicViews --> StorageLayer[StorageManager Reactivo]
        AdminViews --> StorageLayer
        StorageLayer --> MemoryCache[Caché en Memoria - Latencia 0ms]
    end
    
    subgraph Storage [Persistencia Local de Alto Rendimiento]
        MemoryCache <--> IDBLayer[Motor IndexedDB (TalentATS_ProductionDB_v2)]
        IDBLayer --> StoreHist[(historical_candidates - Base Histórica)]
        IDBLayer --> StoreVac[(vacancies_2026)]
        IDBLayer --> StoreCand[(candidates_2026 - Unif. DNI)]
        IDBLayer --> StoreApp[(applications_2026)]
        IDBLayer --> StoreUsers[(admin_users)]
    end
```

### Componentes del Stack
- **Framework:** React 19 con TypeScript estricto.
- **Herramienta de Construcción:** Vite v8.3.
- **Persistencia de Datos:** IndexedDB nativo encapsulado en `src/lib/idb.ts` con transacciones atómicas `readwrite` y operaciones por lotes (`bulkPut`).
- **Gestor de Estado y Reactividad:** `StorageManager` (`src/lib/storage.ts`) con patrón *Observer / PubSub*, caché en memoria y actualizaciones inmutables para garantizar renderizado instantáneo en React.
- **Visualización de Datos:** Recharts para gráficos ejecutivos y termómetros de dispersión salarial.
- **Procesamiento de Archivos:** SheetJS (XLSX) para importación masiva de CSVs delimitados y exportación a libros de cálculo Excel oficiales.
- **Iconografía:** Lucide React.
- **Estilos:** Vanilla CSS con variables corporativas (`src/index.css`) bajo estándares de diseño premium.

---

## 3. ESTRUCTURA DE DIRECTORIOS (FEATURE-BASED ARCHITECTURE)

```
nextalent-ats/
├── .oxlintrc.json              # Configuración de linter
├── package.json                # Dependencias del proyecto
├── tsconfig.json               # Configuración de TypeScript
├── vite.config.ts              # Configuración del bundler Vite con API proxies
├── public/
│   ├── favicon.svg             # Favicon institucional
│   └── icons.svg               # Sprites de soporte
├── server/
│   ├── driveService.ts         # Integración servidor con Google Drive API & Sheets
│   └── biginService.ts         # Integración servidor con Zoho Bigin CRM API
├── src/
│   ├── main.tsx                # Entrada principal de la aplicación
│   ├── index.css               # Sistema de diseño, tokens corporativos y utilidades
│   ├── types/
│   │   └── index.ts            # Definición centralizada de tipos y modelos de datos
│   ├── app/
│   │   ├── AdminLayout.tsx     # Shell del Panel de Control (Sidebar oscuro, navegación, logout)
│   │   └── PublicLayout.tsx    # Shell público (Navbar corporativo, footer y modales globales)
│   ├── components/
│   │   ├── BiginConnectionModal.tsx # Centro de control y sincronización Zoho Bigin
│   │   └── ui/
│   │       ├── Badge.tsx       # Etiquetas de estado e indicadores temáticos
│   │       ├── Button.tsx      # Botones con variantes ejecutivas (primary, cyan, outline)
│   │       ├── Card.tsx        # Contenedores con elevación y bordes sutiles
│   │       ├── Logo.tsx        # Componente oficial del logo vectorial NexTalent ATS
│   │       └── Modal.tsx       # Modales accesibles con backdrop difuminado
│   ├── lib/
│   │   ├── analyticsUtils.ts   # Algoritmos de maestría, salarios y agregación
│   │   ├── biginService.ts     # Cliente frontend para Zoho Bigin CRM
│   │   ├── driveUpload.ts      # Cliente frontend para carga en Google Drive
│   │   ├── idb.ts              # Envoltorio asíncrono para IndexedDB
│   │   ├── mockData.ts         # Cuenta inicial SuperAdmin por defecto
│   │   ├── security.ts         # Capas de seguridad, hashing SHA-256, honeypot y rate limiting
│   │   └── storage.ts          # StorageManager reactivo con caché y PubSub
│   └── modules/
│       ├── analytics/
│       │   └── AdminAnalyticsView.tsx    # Dashboard ejecutivo y métricas consolidadas
│       ├── auth/
│       │   ├── LoginView.tsx             # Pantalla de acceso al sistema con brute-force protection
│       │   └── TeamManagementView.tsx    # Gestión de usuarios, roles RBAC y auditoría
│       ├── candidates/
│       │   ├── AdminCandidatesView.tsx   # Repositorio unificado por DNI (12 columnas)
│       │   └── CandidateCvModal.tsx      # Ficha del postulante, historial y preguntas del puesto
│       ├── client-portal/
│       │   └── ClientPortalView.tsx      # Portal ejecutivo de auditoría para clientes
│       ├── historical-8k/
│       │   └── AdminHistorical8kView.tsx # Explorador y buscador de la Base Histórica
│       ├── import-export/
│       │   └── AdminMigrationView.tsx    # Descarga de plantillas modelo (.xlsx)
│       ├── landing/
│       │   └── LandingView.tsx           # Web corporativa, propuesta de valor y sectores
│       └── vacancies/
│           ├── AdminVacanciesView.tsx     # Listado y control de estados de procesos
│           ├── AdminVacancyDetailView.tsx # Detalle del proceso, tabla de postulantes y exportación
│           ├── ApplicationFormModal.tsx   # Modal de postulación directa o espontánea
│           ├── CreateVacancyModal.tsx     # Creación guiada de nuevas búsquedas ejecutivas
│           ├── CustomQuestionsForm.tsx    # Constructor dinámico de preguntas por puesto
│           ├── Import2026ProcessModal.tsx # Importador inteligente de CSVs con preguntas dinámicas
│           ├── JobApplicationPageView.tsx # Landing pública de postulación independiente (?job=id)
│           └── PublicVacanciesView.tsx    # Job board interactivo con filtros públicos
```

---

## 4. MODELO DE DATOS Y PERSISTENCIA (INDEXEDDB)

La base de datos `TalentATS_ProductionDB_v2` se almacena localmente en el navegador a través de IndexedDB:

### A. Base Histórica Inmutable (`historical_8k`)
Contiene las 23 columnas exactas de los registros de candidatos de la Base Histórica para consulta y filtrado instantáneo.

### B. `vacancies_2026` (Procesos de Búsqueda)
- `id`: Identificador único (`vac-2026-...`)
- `code`: Código alfanumérico (ej: `ATS-2026-01`)
- `title`: Título del puesto
- `sector`: Sector económico (Minería, Banca, Retail, etc.)
- `location`: Ubicación geográfica
- `modality`: *Presencial*, *Híbrido* o *Remoto*
- `description`: Resumen del rol y requisitos
- `status`: `'active'`, `'paused'`, `'closed'`
- `folderName`: Nombre asignado de la carpeta en Google Drive
- `driveFolderUrl`, `cvsFolderUrl`: Enlaces directos a las carpetas en la nube
- `customQuestions`: Lista de preguntas específicas del puesto

### C. `candidates_2026` (Talentos Unificados por DNI)
Deduplicado por clave primaria `dni` con sus 12 columnas base de evaluación ejecutiva.

### D. `applications_2026` (Postulaciones Vinculadas)
Relación muchos-a-muchos entre postulante y vacante con estado de pipeline, respuestas personalizadas y link del CV.

### E. `admin_users` (Seguridad y Control de Acceso)
Usuarios con roles (`SuperAdmin`, `Recruiter`, `Viewer`), passwords hasheadas con SHA-256 + salt y control de sesiones activas.

---

## 5. CAPAS DE SEGURIDAD (SECURITY HARDENING)

1. **Inspección Binaria de Archivos (Magic Bytes):** Validación de firmas reales `%PDF` y `PK\x03\x04` en archivos de CV (.pdf/.docx), bloqueando ejecutables camuflados y macros maliciosas.
2. **Protección Anti-Fórmula (CSV/XLSX Injection):** Sanitización automática de celdas que inicien con `=`, `+`, `-`, `@` anteponiendo apóstrofe para evitar ejecución remota de comandos en hojas de cálculo.
3. **Sanitización XSS y Protocolos Seguros:** Bloqueo de `javascript:`, `data:`, `vbscript:`, uso estricto de `rel="noopener noreferrer"` en enlaces externos y limpieza de inputs.
4. **Protección contra Fuerza Bruta (Brute-Force Lockout):** Bloqueo automático tras 5 intentos fallidos de inicio de sesión con temporizador regresivo.
5. **Honeypot Invisible y Rate Limiting:** Detección de bots automatizados mediante campo trampa y límite de postulaciones por tiempo.
6. **Auditoría Inmutable (Audit Trail):** Registro de eventos críticos en IndexedDB (inicios de sesión, exportaciones, eliminación de datos).

---

## 6. COMANDOS DE EJECUCIÓN

```bash
# Desarrollo local con HMR
npm run dev

# Compilación de producción
npm run build

# Verificación de linter
npm run lint

# Previsualizar build local
npm run preview
```
