import React from 'react';
import { Vacancy2026, Candidate2026, HistoricalCandidate8k } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  ArrowRight,
  FolderTree
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminMigrationViewProps {
  vacancies: Vacancy2026[];
  candidates: Candidate2026[];
  historical8k: HistoricalCandidate8k[];
  onNavigateToHistoricalImport: () => void;
  onNavigateTo2026Import: () => void;
}

export const AdminMigrationView: React.FC<AdminMigrationViewProps> = ({
  vacancies,
  candidates,
  historical8k,
  onNavigateToHistoricalImport,
  onNavigateTo2026Import
}) => {
  // Download Template Base Histórica (23 columns)
  const handleDownload8kTemplate = () => {
    const sample = [
      {
        Nombre: 'Carlos Morales',
        Género: 'Masculino',
        Edad: 45,
        'Número telefónico': '+51 984 123 456',
        Correo: 'carlos.morales@ejemplo.com',
        LinkedIn: 'https://linkedin.com/in/carlosmorales',
        'Carrera (pregrado)': 'Ingeniería Industrial',
        'Universidad (pregrado)': 'Universidad de Lima',
        Maestría: 'MBA',
        'Casa de estudio (Maestría)': 'CENTRUM Católica',
        'Especializaciones/Diplomados': 'Diplomado en Supply Chain',
        'Casa de estudio (Especializaciones/Diplomados)': 'ESAN',
        'Sueldo (estimación) [mensuales & soles]': 24000,
        'Línea de especialización': 'Operaciones',
        Área: 'Operaciones',
        'Años de experiencia': 18,
        'Última posición': 'Gerente de Logística',
        'Fecha de última posición': '2023 - Presente',
        'Nivel de inglés': 'Avanzado',
        'Última empresa': 'Alicorp S.A.A.',
        '# de trabajadores (última empresa)': '1000+',
        'Facturacion 2024 [dólares]': 'USD $800M+',
        'Link del CV': 'https://drive.google.com/...'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Base Histórica');
    XLSX.writeFile(wb, 'Plantilla_Base_Historica_23_Columnas.xlsx');
  };

  // Download Template 2026 (12 base columns + CV link)
  const handleDownload2026Template = () => {
    const sample = [
      {
        Fecha: '2026-03-15',
        Nombre: 'Mariana De la Puente',
        DNI: '10847291',
        Teléfono: '+51 998 765 432',
        Edad: 42,
        'Actual o última posición': 'Directora Comercial',
        'Sector / Rubro': 'Consumo Masivo',
        'Años de experiencia': 16,
        'Salario actual o último salario': 28000,
        'Inglés avanzado': 'Avanzado',
        Maestría: 'SÍ - MBA CENTRUM',
        'Tipo de empresa': 'Multinacional',
        'Pregunta Personalizada 1': 'Respuesta ejemplo',
        'Link del CV': 'https://drive.google.com/file/...'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla 2026');
    XLSX.writeFile(wb, 'Plantilla_Procesos_2026_12_Columnas.xlsx');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ats-navy)', margin: '0 0 4px 0' }}>
          Centro de Migración & Plantillas Excel
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ats-text-secondary)' }}>
          Acceso centralizado a las plantillas estándar y motores de importación de IndexedDB.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Module A Card */}
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Database size={22} color="#0066CC" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--ats-navy)' }}>
              1. Base Histórica
            </h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--ats-text-secondary)', marginBottom: 16 }}>
            Estructura fija de 23 columnas exactas (A a W). Diseñado para procesar y alojar registros de candidatos en IndexedDB.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={handleDownload8kTemplate}>
              Descargar Plantilla (23 Cols)
            </Button>
            <Button variant="primary" size="sm" icon={<ArrowRight size={14} />} iconPosition="right" onClick={onNavigateToHistoricalImport}>
              Ir al Importador de Base Histórica
            </Button>
          </div>
        </Card>

        {/* Module B Card */}
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FolderTree size={22} color="#00A3E0" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--ats-navy)' }}>
              2. Procesos 2026 (20 CSVs)
            </h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--ats-text-secondary)', marginBottom: 16 }}>
            Estructura de 12 columnas fijas base (A a L) con detección automática de columnas intermedias M-Q y link final de CV.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={handleDownload2026Template}>
              Descargar Plantilla 2026
            </Button>
            <Button variant="cyan" size="sm" icon={<ArrowRight size={14} />} iconPosition="right" onClick={onNavigateTo2026Import}>
              Importar CSV de Puesto
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
