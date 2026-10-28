import React, { useMemo } from 'react';
import { Candidate2026, Vacancy2026 } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  GraduationCap,
  Languages,
  Users,
  Briefcase,
  PieChart as PieIcon,
  Building,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface AdminAnalyticsViewProps {
  candidates: Candidate2026[];
  vacancies: Vacancy2026[];
}

import { hasMasterDegree, parseSalaryNumber, parseExperienceNumber } from '../../lib/analyticsUtils';

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({
  candidates,
  vacancies
}) => {
  // 1. Numeric salary list for KPIs
  const salaries = useMemo(() => {
    return candidates.map((c) => parseSalaryNumber(c.salarioActualUltimo)).filter((s) => s > 0);
  }, [candidates]);

  const avgSalary = salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0;
  const minSalary = salaries.length > 0 ? Math.min(...salaries) : 0;
  const maxSalary = salaries.length > 0 ? Math.max(...salaries) : 0;

  // 2. Master's degree count
  // Business rule: Any non-empty value that isn't "No menciona", "No", etc. counts as having a master's degree
  const withMasterCount = useMemo(() => {
    return candidates.filter((c) => hasMasterDegree(c.maestria)).length;
  }, [candidates]);

  const masterPercent = candidates.length > 0 ? Math.round((withMasterCount / candidates.length) * 100) : 0;

  // 3. English Avanzado count (Sí / No)
  const englishCounts = useMemo(() => {
    let yes = 0;
    let no = 0;
    candidates.forEach((c) => {
      const eng = (c.inglesAvanzado || '').trim();
      if (['Sí', 'Si', 'SI', 'Yes', 'Avanzado', 'Nativo', 'true', '1'].includes(eng)) {
        yes++;
      } else {
        no++;
      }
    });
    return { yes, no };
  }, [candidates]);

  const englishYesPercent = candidates.length > 0 ? Math.round((englishCounts.yes / candidates.length) * 100) : 0;

  // 4. CHART 1: Evolution of Applications over time (Area / Line Chart)
  const timelineData = useMemo(() => {
    const map: Record<string, number> = {};
    candidates.forEach((c) => {
      const dateKey = (c.fecha || c.createdAt || '2026-03').slice(0, 7); // YYYY-MM
      map[dateKey] = (map[dateKey] || 0) + 1;
    });

    const sortedKeys = Object.keys(map).sort();
    let cumulative = 0;
    return sortedKeys.map((key) => {
      cumulative += map[key];
      // Format label e.g. "Mar 2026"
      const [y, m] = key.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
      const monthLabel = m ? `${monthNames[parseInt(m, 10) - 1] || m} ${y}` : key;
      return {
        periodo: monthLabel,
        nuevos: map[key],
        acumulado: cumulative
      };
    });
  }, [candidates]);

  // 5. CHART 2: Sector Distribution (Horizontal Bar Chart)
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    candidates.forEach((c) => {
      const sec = c.sectorRubro || 'Sin especificar';
      map[sec] = (map[sec] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [candidates]);

  // 6. CHART 3: Salaries vs. Experience Brackets (Grouped Bar Chart)
  const salaryByExpData = useMemo(() => {
    const brackets = [
      { key: '0-3', label: '0 a 3 años', totalSal: 0, count: 0 },
      { key: '4-7', label: '4 a 7 años', totalSal: 0, count: 0 },
      { key: '8-12', label: '8 a 12 años', totalSal: 0, count: 0 },
      { key: '+12', label: '+12 años', totalSal: 0, count: 0 }
    ];

    candidates.forEach((c) => {
      const exp = parseExperienceNumber(c.aniosExperiencia);
      const sal = parseSalaryNumber(c.salarioActualUltimo);
      if (sal <= 0) return;

      if (exp <= 3) {
        brackets[0].totalSal += sal;
        brackets[0].count++;
      } else if (exp <= 7) {
        brackets[1].totalSal += sal;
        brackets[1].count++;
      } else if (exp <= 12) {
        brackets[2].totalSal += sal;
        brackets[2].count++;
      } else {
        brackets[3].totalSal += sal;
        brackets[3].count++;
      }
    });

    return brackets.map((b) => ({
      rango: b.label,
      salarioPromedio: b.count > 0 ? Math.round(b.totalSal / b.count) : 0,
      candidatos: b.count
    }));
  }, [candidates]);

  // 7. CHART 4: Donut Charts (English, Master's, Company Type)
  const englishDonutData = useMemo(() => [
    { name: 'Inglés Avanzado (Sí)', value: englishCounts.yes, color: '#10B981' },
    { name: 'Sin Inglés Avanzado (No)', value: englishCounts.no, color: '#94A3B8' }
  ], [englishCounts]);

  const masterDonutData = useMemo(() => [
    { name: 'Con Maestría / Posgrado', value: withMasterCount, color: '#0066CC' },
    { name: 'Sin Maestría Declarada', value: Math.max(0, candidates.length - withMasterCount), color: '#F59E0B' }
  ], [candidates.length, withMasterCount]);

  const companyTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    candidates.forEach((c) => {
      const t = c.tipoEmpresa || 'Otras';
      map[t] = (map[t] || 0) + 1;
    });

    const palette = ['#1B2A4A', '#0066CC', '#00A3E0', '#10B981', '#8B5CF6', '#F59E0B'];
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [candidates]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ats-navy)', margin: 0 }}>
            Dashboard de Business Intelligence & Analítica
          </h1>
          <Badge variant="blue">Métricas Oficiales 2026+</Badge>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ats-text-secondary)' }}>
          Visualización estadística de alta precisión generada sobre {candidates.length} candidatos y {vacancies.length} procesos.
        </p>
      </div>

      {candidates.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BarChart3 size={44} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--ats-navy)', margin: '0 0 6px 0' }}>
            No hay datos suficientes para generar analítica 2026
          </h3>
          <p style={{ color: 'var(--ats-text-muted)', fontSize: '0.875rem', maxWidth: 500, margin: '0 auto' }}>
            Importa los CSVs de tus procesos 2026 o recibe postulaciones web para poblar este panel de Business Intelligence automáticamente.
          </p>
        </Card>
      ) : (
        <>
          {/* Top 4 KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Card padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ats-text-muted)', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>Universo de Talentos (DNI)</span>
                <Users size={16} color="#0066CC" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ats-navy)', marginTop: 4 }}>
                {candidates.length.toLocaleString('es-PE')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 4 }}>
                En {vacancies.length} procesos evaluados
              </div>
            </Card>

            <Card padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ats-text-muted)', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>Sueldo Promedio Declarado</span>
                <DollarSign size={16} color="#00A3E0" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0066CC', marginTop: 4 }}>
                S/. {avgSalary.toLocaleString('es-PE')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600, marginTop: 4 }}>
                Rango: S/. {minSalary.toLocaleString('es-PE')} - S/. {maxSalary.toLocaleString('es-PE')}
              </div>
            </Card>

            <Card padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ats-text-muted)', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>% Con Maestría / MBA</span>
                <GraduationCap size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#065F46', marginTop: 4 }}>
                {masterPercent}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 4 }}>
                {withMasterCount} de {candidates.length} ejecutivos
              </div>
            </Card>

            <Card padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ats-text-muted)', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>Inglés Avanzado (Sí)</span>
                <Languages size={16} color="#0066CC" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ats-navy)', marginTop: 4 }}>
                {englishYesPercent}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#00A3E0', fontWeight: 600, marginTop: 4 }}>
                {englishCounts.yes} ejecutivos bilingües
              </div>
            </Card>
          </div>

          {/* 1. GRÁFICO DE LÍNEAS / ÁREA: Evolución de Postulaciones en el Tiempo */}
          <Card padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={20} color="#0066CC" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--ats-navy)' }}>
                  Evolución Temporal de Postulantes Registrados
                </h3>
              </div>
              <Badge variant="cyan">Tendencia Acumulada</Badge>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNuevos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066CC" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0066CC" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A3E0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00A3E0" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="periodo" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111D36',
                      borderColor: '#1B2A4A',
                      borderRadius: 8,
                      color: '#FFFFFF',
                      fontSize: '0.85rem'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="nuevos"
                    name="Nuevos Postulantes"
                    stroke="#0066CC"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorNuevos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="acumulado"
                    name="Total Acumulado"
                    stroke="#00A3E0"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorAcumulado)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 2 & 3: BARRAS HORIZONTALES (SECTOR) Y SUELDOS VS EXPERIENCIA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
            {/* Gráfico de Barras Horizontales: Sector / Rubro */}
            <Card padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Briefcase size={20} color="#0066CC" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--ats-navy)' }}>
                  Distribución por Sector / Rubro
                </h3>
              </div>

              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sectorData.slice(0, 7)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={12} tickLine={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#1B2A4A"
                      fontSize={11}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111D36',
                        borderColor: '#1B2A4A',
                        borderRadius: 8,
                        color: '#FFFFFF',
                        fontSize: '0.85rem'
                      }}
                      formatter={(val: any) => [`${val} candidatos`, 'Total']}
                    />
                    <Bar dataKey="value" fill="#0066CC" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Gráfico de Barras: Sueldos vs. Años de Experiencia */}
            <Card padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <DollarSign size={20} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--ats-navy)' }}>
                  Salario Promedio según Años de Experiencia
                </h3>
              </div>

              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryByExpData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="rango" stroke="#64748B" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `S/.${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111D36',
                        borderColor: '#1B2A4A',
                        borderRadius: 8,
                        color: '#FFFFFF',
                        fontSize: '0.85rem'
                      }}
                      formatter={(val: any) => [`S/. ${Number(val).toLocaleString('es-PE')}`, 'Promedio']}
                    />
                    <Bar dataKey="salarioPromedio" name="Sueldo Promedio (S/.)" fill="#00A3E0" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* 4. GRÁFICOS DE DONA (PIE CHARTS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
            {/* Dona 1: Inglés Avanzado (Sí / No) */}
            <Card padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Languages size={18} color="#0066CC" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ats-navy)' }}>
                  Inglés Avanzado (Sí vs. No)
                </h4>
              </div>

              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={englishDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {englishDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111D36',
                        borderRadius: 6,
                        color: '#FFFFFF',
                        fontSize: '0.8rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: '0.8rem', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span>Sí: <strong>{englishCounts.yes} ({englishYesPercent}%)</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                  <span>No: <strong>{englishCounts.no} ({100 - englishYesPercent}%)</strong></span>
                </div>
              </div>
            </Card>

            {/* Dona 2: Maestría (Con vs Sin) */}
            <Card padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <GraduationCap size={18} color="#0066CC" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ats-navy)' }}>
                  Grado de Maestría / MBA
                </h4>
              </div>

              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={masterDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {masterDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111D36',
                        borderRadius: 6,
                        color: '#FFFFFF',
                        fontSize: '0.8rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: '0.8rem', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#0066CC' }} />
                  <span>Con Maestría: <strong>{withMasterCount} ({masterPercent}%)</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <span>Sin Maestría: <strong>{Math.max(0, candidates.length - withMasterCount)} ({100 - masterPercent}%)</strong></span>
                </div>
              </div>
            </Card>

            {/* Dona 3: Tipo de Empresa */}
            <Card padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Building size={18} color="#1B2A4A" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ats-navy)' }}>
                  Tipo de Empresa de Origen
                </h4>
              </div>

              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={companyTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {companyTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111D36',
                        borderRadius: 6,
                        color: '#FFFFFF',
                        fontSize: '0.8rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, fontSize: '0.75rem', marginTop: 8 }}>
                {companyTypeData.slice(0, 4).map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
                    <span>{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
