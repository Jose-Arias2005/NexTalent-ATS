# NexTalent ATS — Executive Search & Talent Acquisition Platform

![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![IndexedDB](https://img.shields.io/badge/Database-IndexedDB_v2-22C55E)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

> **NexTalent ATS** es una plataforma corporativa integral de Executive Search y Sistema de Seguimiento de Candidatos (ATS) construida con una arquitectura modular de alto rendimiento sobre **React 19**, **TypeScript** e **IndexedDB**. Diseñada para reemplazar el uso de hojas de cálculo dispersas por un centro de operaciones reactivo, seguro y de latencia cero.

---

## 🌟 Características Principales

### 1. Portal Público y Job Board Ejecutivo ("Executive Ledger")
- **Diseño Swiss Grid & Tech Executive:** Estética inspirada en firmas de alta consultoría estratégica (Palantir, Stripe, McKinsey), tipografía corporativa y navegación ultra fluida.
- **Convocatorias Dinámicas:** Búsqueda en tiempo real, filtros sectoriales y enlaces directos únicos (`?job=[id]`) para difusión en redes ejecutivas.
- **Postulación Inteligente:** Formulario optimizado con carga segura de CV, preguntas personalizadas por vacante y consentimiento de privacidad.

### 2. Panel Administrativo y Mini-ATS en Tiempo Real
- **Caché en Memoria con Latencia 0ms:** Patrón *Observer / PubSub* acoplado a IndexedDB con sincronización optimista e instantánea.
- **Doble Motor de Datos:**
  - **Base Histórica:** Repositorio inmutable de candidatos con 23 columnas exactas, buscador reactivo y accesos directos a WhatsApp, LinkedIn y CV.
  - **Talentos Unificados por DNI:** Deduplicación estricta de candidatos bajo 12 columnas base estándar de headhunting y preguntas técnicas por vacante.
- **Constructor de Preguntas Personalizadas:** Soporte para texto libre, selección única, selección múltiple (checkboxes) y preguntas condicionales Sí/No con caja de especificación animada.

### 3. Dashboard Analítico y Termómetro Salarial
- Métricas consolidadas con gráficos reactivos interactivos (**Recharts**).
- Termómetros de dispersión salarial (algoritmo inteligente para rangos monetarios y textuales).
- Distribución de posgrados/maestrías, niveles de inglés y procedencia por tipo de empresa.

### 4. Integraciones Cloud y CRM Empresarial
- **Google Drive & Google Sheets API:** Carga directa y organizada de CVs a carpetas en la nube y generación/sincronización automática de hojas de cálculo por vacante.
- **Zoho Bigin CRM:** Conexión nativa con Sub-Pipelines del CRM, carga directa mediante drag-and-drop de archivo `self_client.json`, selector dinámico de cualquier Pipeline en la organización y botón de reseteo/desconexión limpia de credenciales.

### 5. Portal de Empresas Clientes
- **Tablero Kanban Dinámico Adaptativo:** Visualización en vivo tipo espejo de Zoho Bigin CRM, adaptándose automáticamente al número exacto de etapas configuradas en el pipeline (sin restricciones rígidas).
- **Acceso Directo y Seguro a CVs:** Consulta inmediata de currículums resguardados en Google Drive con validación de enlaces y detalles de respuestas personalizadas.
- **Analítica de la Búsqueda:** Visualización en tiempo real de rangos salariales y dispersión de postulantes por proceso.

---

## 🛡️ Blindaje de Seguridad Institucional (Security Hardening)

- **Validación Binaria de Archivos (Magic Bytes):** Inspección de firmas `%PDF` y `PK\x03\x04` en archivos `.pdf` y `.docx` para mitigar riesgos de malware o macros maliciosas. Límite DoS de 5MB por CV.
- **Protección Anti-Inyección de Fórmulas:** Sanitización de celdas en importaciones y exportaciones Excel/CSV (SheetJS) contra vulnerabilidades DDE / RCE.
- **Prevención de Fuerza Bruta (Brute-Force Lockout):** Bloqueo automático tras 5 intentos fallidos de inicio de sesión con temporizador persistente en pantalla.
- **Criptografía Salted SHA-256:** Almacenamiento seguro de credenciales y firmas criptográficas de sesión de 8 horas con verificación de integridad.
- **Anti-Spam & Anti-Bot:** Campo honeypot invisible y rate limiting de postulaciones por tiempo.
- **Registro de Auditoría (Audit Log):** Trazabilidad inmutable de inicios de sesión, exportaciones, modificaciones y eliminaciones.

---

## 🚀 Arquitectura y Tecnologías

```mermaid
graph TD
    User([Visitante / Candidato]) -->|Web Pública / Link Directo| PublicViews[Landing & Job Board]
    Recruiter([Equipo de Selección]) -->|Acceso Autenticado| AdminViews[Panel ATS & Métricas]
    
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

    subgraph Integraciones Cloud
        AdminViews -->|Proxy Vite| DriveAPI[Google Drive & Sheets API]
        AdminViews -->|Proxy Vite| BiginAPI[Zoho Bigin CRM API]
    end
```

- **Frontend:** React 19, TypeScript estricto, Vite 8.3
- **Estilos:** Vanilla CSS modular con tokens arquitectónicos y dark/light themes
- **Persistencia:** IndexedDB nativo (sin dependencias de base de datos externa para funcionamiento autónomo)
- **Visualización:** Recharts
- **Hojas de Cálculo:** SheetJS (XLSX)
- **Iconografía:** Lucide React

---

## 📦 Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** `>= 18.0.0` (LTS v20+ recomendado)
- **npm** `>= 9.0.0`

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd nextalent-ats
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar servidor local de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible inmediatamente en `http://localhost:5173`.

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

5. **Verificar calidad de código:**
   ```bash
   npm run lint
   ```

---

---

## 🔐 Guía Paso a Paso: Conexión de Tokens (Google Drive & Zoho Bigin)

La plataforma puede funcionar de manera autónoma en local con IndexedDB, pero para habilitar la sincronización en la nube con **Google Drive** (guardado de CVs en carpetas y exportación automática a Google Sheets) y **Zoho Bigin CRM** (pipeline de candidatos), sigue estas sencillas guías para obtener y configurar tus credenciales.

```
📁 Raíz del proyecto (nextalent-ats/)
 ├── token.json            <-- Credenciales OAuth de Google Drive / Sheets
 └── bigin_token.json      <-- Tokens OAuth de Zoho Bigin CRM
```

---

### 1. Configuración de Google Drive & Sheets API (`token.json`)

Esta integración permite:
- Subir automáticamente el archivo CV de cada candidato a carpetas específicas en Google Drive nombradas según la vacante.
- Sincronizar en tiempo real los datos del candidato en una hoja de cálculo dedicada de Google Sheets.

#### Paso 1: Crear proyecto en Google Cloud Console
1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/).
2. En la barra superior, haz clic en el selector de proyectos y selecciona **"Nuevo Proyecto"**.
3. Asigna un nombre al proyecto (ej. `NexTalent ATS`) y pulsa **Crear**.

#### Paso 2: Habilitar las APIs necesarias
1. En el menú lateral izquierdo, ve a **APIs y servicios** > **Biblioteca**.
2. Busca **"Google Drive API"** y haz clic en **Habilitar**.
3. Vuelve a la biblioteca, busca **"Google Sheets API"** y haz clic en **Habilitar**.

#### Paso 3: Configurar la Pantalla de Consentimiento OAuth
1. Ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth**.
2. Selecciona **External** (Externo) y pulsa **Crear**.
3. Rellena los datos básicos:
   - **Nombre de la aplicación:** `NexTalent ATS`
   - **Correo electrónico de soporte del usuario:** Tu correo de Gmail.
   - **Datos de contacto del desarrollador:** Tu correo de Gmail.
4. En la sección **Permisos (Scopes)**, haz clic en **Agregar o quitar permisos** y selecciona:
   - `https://www.googleapis.com/auth/drive.file` *(Ver, editar, crear y borrar solo los archivos creados por esta app)*
   - `https://www.googleapis.com/auth/spreadsheets` *(Ver y administrar hojas de cálculo en Google Drive)*
5. En la sección **Usuarios de prueba (Test users)**, pulsa **Add Users** e ingresa la cuenta de Gmail con la que vas a utilizar tu Drive y Sheets. Guarda los cambios.

#### Paso 4: Crear Credenciales de Cliente OAuth 2.0
1. Ve a **APIs y servicios** > **Credenciales**.
2. Haz clic en **+ Crear Credenciales** > **ID de cliente de OAuth**.
3. En **Tipo de aplicación**, elige **Aplicación de escritorio** (o Web Application).
4. Dale el nombre `ATS Client` y pulsa **Crear**.
5. Verás en pantalla tu **ID de cliente** (`client_id`) y tu **Secreto de cliente** (`client_secret`).

#### Paso 5: Obtener el `refresh_token` permanente
Para generar tu `refresh_token` sin necesidad de montar un servidor de redirección:
1. Abre [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Haz clic en el ícono de engranaje (⚙️) en la esquina superior derecha:
   - Marca la casilla **"Use your own OAuth credentials"**.
   - Pega tu **OAuth Client ID** y tu **OAuth Client secret** obtenidos en el Paso 4.
3. En el panel izquierdo ("Step 1 - Select & authorize APIs"):
   - En el recuadro "Input your own scopes" ingresa:  
     `https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets`
   - Haz clic en **Authorize APIs**.
4. Inicia sesión con la cuenta de Google que registraste como usuario de prueba y concede los permisos.
5. Serás redirigido al "Step 2": Haz clic en el botón azul **"Exchange authorization code for tokens"**.
6. Copia el valor del campo **Refresh token**.

#### Paso 6: Crear el archivo `token.json`
En la raíz del proyecto (`nextalent-ats/`), crea un archivo llamado `token.json` con la siguiente estructura:

```json
{
  "client_id": "TU_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "TU_CLIENT_SECRET",
  "refresh_token": "TU_REFRESH_TOKEN",
  "type": "authorized_user"
}
```

> **Tip:** Alternativamente, si descargaste el archivo de credenciales desde Google Cloud Console con el formato de instalación de escritorio, guárdalo como `oauth_credentials.json` en la raíz.

---

### 2. Configuración de Zoho Bigin CRM (`bigin_token.json`)

Esta integración permite conectar la plataforma con los Sub-Pipelines de vacantes en Zoho Bigin CRM, empujar candidatos automáticamente a la etapa de "Preseleccionados" y registrar notas con respuestas del candidato.

#### Paso 1: Ingresar a Zoho Developer Console
1. Abre [Zoho Developer Console](https://api-console.zoho.com/) con tu cuenta de Zoho.
2. Si es tu primera vez, pulsa **"Get Started"** o **"Add Client"**.

#### Paso 2: Crear un cliente "Self Client"
1. En la lista de tipos de cliente, selecciona **Self Client** (Cliente interno / automático).
2. Confirma la creación del cliente.
3. En la pestaña **Client Secret**, copia:
   - **Client ID** (ej: `1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
   - **Client Secret** (ej: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

#### Paso 3: Generar el Código de Concesión (Grant Code)
1. En la misma pantalla de tu Self Client, haz clic en la pestaña **"Generate Code"**.
2. Completa los campos:
   - **Scope:**  
     `ZohoBigin.modules.ALL,ZohoBigin.settings.ALL`
   - **Time Duration:** Selecciona `10 minutes`.
   - **Scope Description:** `NexTalent ATS CRM Sync`
3. Haz clic en **Generate**.
4. Se generará un código alfanumérico temporal (Grant Code). **Cópialo de inmediato** (caduca en 10 minutos).

#### Paso 4: Generar y Guardar el Token Permanente (Métodos Disponibles)

##### Método 1: Subiendo el archivo `self_client.json` (Ultra Rápido y Recomendado)
Si descargaste o guardaste tu archivo `self_client.json` desde Zoho Developer Console:
1. Inicia la aplicación (`npm run dev`) e ingresa al panel administrativo.
2. Abre el modal de **"Zoho CRM"** en la barra superior.
3. En la pestaña **"Configuración OAuth2"**, simplemente **arrastra y suelta tu archivo `self_client.json`** en el recuadro de carga (o haz clic en "Subir self_client.json").
4. El sistema extraerá automáticamente el `Client ID` y el `Client Secret`.
5. Si generaste el **Grant Code** temporal en Zoho Console, pégalo en el campo y pulsa **"Generar Refresh Token"** (o si tu archivo JSON ya incluía el código o un refresh_token previo, la conexión se completará al instante de forma 100% automática).

##### Método 2: Ingreso Manual de Credenciales
Si prefieres ingresar los campos manualmente:
1. Pega tu **Client ID** y **Client Secret** en los campos respectivos.
2. Pega el **Grant Code** temporal obtenido en el Paso 3.
3. Haz clic en el botón verde **"Generar Refresh Token y Guardar"**.
4. El backend local creará de forma transparente el archivo `bigin_token.json` en la raíz del proyecto y el estado pasará a **CONECTADO**.

##### Quitar Credenciales y Reconfigurar (Reset):
- Si te has equivocado de cuenta, de Client Secret o deseas desconectar Zoho Bigin, pulsa el botón **"Quitar Credenciales / Desconectar"** (icono de papelera roja) situado tanto en la cabecera del modal como en el pie de la pestaña *Configuración OAuth2*.
- Al confirmar, el sistema limpiará los tokens en memoria y eliminará los archivos de credenciales (`bigin_token.json` y `self_client.json`), dejando los campos en blanco y la zona de carga lista para que coloques una nueva configuración.

---

### 3. Selección Dinámica de Pipeline y Fases Adaptativas

- **Cualquier Pipeline de Bigin:** No es obligatorio que el Pipeline se llame *"Jobs"*. Una vez conectado, el modal te permite seleccionar entre todos los Pipelines disponibles en tu organización de Zoho Bigin (ej: *Jobs*, *Selección Ejecutiva*, *Mandatos 2026*, etc.).
- **Tablero Kanban Adaptativo para Empresas:** La vista de la empresa cliente en el **Portal de Clientes** no está forzada a 6 fases fijas; se adapta dinámicamente al número exacto de etapas (4, 5, 6 o más) que tengas configuradas en tu Pipeline de Zoho Bigin CRM, sincronizando en vivo a cada candidato con su etapa real.

---

## 🔑 Credenciales Iniciales de Acceso

Al inicializar la plataforma por primera vez, se genera automáticamente una cuenta de administrador para acceso al panel:

- **Usuario:** `admin@talentats.com`
- **Contraseña:** `Admin2026*Executive`

*(Puedes crear usuarios adicionales, cambiar roles o revocar accesos en el módulo de Equipo / Seguridad).*

---

## 📄 Licencia

Este proyecto está disponible bajo la licencia MIT. Diseñado como plantilla y base para plataformas de reclutamiento ejecutivo de alto estándar.

