# REQUERIMIENTOS DEL SISTEMA — NEXTALENT ATS PLATFORM

**Proyecto:** NexTalent ATS — Executive Search & Talent Acquisition Platform  
**Versión:** Producción 2026  
**Stack Principal:** React 19 · TypeScript · Vite · IndexedDB · Vanilla CSS  

---

## 1. Requisitos de Entorno y Software (Prerrequisitos)

Para compilar, ejecutar y desarrollar la plataforma se requiere:

| Componente | Versión Mínima | Versión Recomendada | Notas |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `20.x` LTS o superior | Motor de ejecución JavaScript en backend |
| **npm** | `>= 9.0.0` | `10.x` | Gestor de paquetes oficial (o pnpm >= 8.x / yarn >= 1.22) |
| **Navegador Web** | Moderno (2022+) | Chrome / Edge 115+, Firefox 115+, Safari 16+ | Debe soportar **IndexedDB v2** y sintaxis ES2022+ |
| **Sistema Operativo** | Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+) | 64-bit | Compatible con cualquier SO soportado por Node.js |

---

## 2. Dependencias de la Aplicación

Todas las dependencias del proyecto se encuentran versionadas y controladas en [`package.json`](./package.json).

### 2.1. Dependencias de Producción (`dependencies`)

- **`react` (`^19.2.8`)**: Biblioteca central para la construcción de interfaces de usuario mediante componentes y hooks.
- **`react-dom` (`^19.2.8`)**: Adaptador de React para el DOM del navegador.
- **`recharts` (`^3.10.1`)**: Motor de gráficos reactivos para el dashboard analítico y termómetro salarial.
- **`xlsx` (`^0.18.5`)**: Procesamiento, lectura y exportación de archivos CSV y hojas de cálculo Excel (`.xlsx`).
- **`lucide-react` (`^1.57.0`)**: Catálogo de iconografía vectorial corporativa de alta definición.

### 2.2. Dependencias de Desarrollo (`devDependencies`)

- **`vite` (`^8.3.0`)**: Herramienta de compilación ultrarrápida con Hot Module Replacement (HMR).
- **`typescript` (`~6.0.2`)**: Compilador y validador de tipado estático estricto.
- **`@vitejs/plugin-react` (`^6.1.1`)**: Integración de React con optimizaciones basadas en Oxc.
- **`oxlint` (`^1.81.0`)**: Linter de alto rendimiento en Rust para control de calidad de código.
- **`@types/react` (`^19.2.18`)**, **`@types/react-dom` (`^19.2.7`)**, **`@types/node` (`^24.13.3`)**: Definiciones de tipos TypeScript para autocompletado y validación.

---

## 3. Requerimientos de Hardware y Rendimiento

- **Memoria RAM Mínima:** 4 GB (8 GB recomendados para desarrollo con HMR y carga de datasets grandes).
- **Almacenamiento Local:** ~100 MB disponibles en disco / cuota del navegador para almacenar los registros de la Base Histórica y archivos CV en IndexedDB (`TalentATS_ProductionDB_v2`).
- **Resolución de Pantalla:**
  - Optimizado para pantallas de escritorio y portátiles (`1366x768` mínimo, `1920x1080` recomendado).
  - Vistas públicas (Job Board y postulaciones) adaptativas y responsivas para dispositivos móviles (smartphones y tablets).

---

## 4. Archivos de Configuración de Integraciones Opcionales

Para sincronización en la nube (el sistema funciona de forma 100% autónoma en local si no se configuran):

- **Google Drive & Google Sheets API:**
  - Archivo `token.json` en la raíz con credenciales OAuth (`client_id`, `client_secret`, `refresh_token`). Permite almacenar CVs en carpetas por vacante y registrar postulantes en hojas de cálculo.
- **Zoho Bigin CRM:**
  - Archivo `self_client.json` (subido directamente desde el modal administrativo mediante drag-and-drop) o `bigin_token.json` generado automáticamente al canjear el Grant Code de Zoho Developer Console. Conecta con cualquier Pipeline de Bigin y soporta reseteo inmediato de credenciales.

---

## 5. Guía de Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd "nextalent-ats"

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor local de desarrollo
npm run dev

# 4. Construir el paquete optimizado para producción
npm run build

# 5. Ejecutar el linter para verificación de código
npm run lint

# 6. Previsualizar la compilación de producción localmente
npm run preview
```
