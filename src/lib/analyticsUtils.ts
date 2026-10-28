// ============================================================================
// UTILIDADES DE PARSEO Y ANÁLISIS DE DATOS 2026+
// ============================================================================

/**
 * Determina si el candidato tiene maestría / posgrado.
 * Regla de evaluación de talento:
 * - Si el valor está vacío o dice "No menciona", "No", "Ninguna", "No tiene", "Sin maestría", "-" -> false.
 * - Cualquier otro texto (ej: "MBA", "Derecho tributario", "Máster...", "Magíster...") -> true.
 */
export const hasMasterDegree = (val: string | undefined | null): boolean => {
  if (!val) return false;
  const clean = val
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!clean || clean === '-' || clean === 'n/a') return false;

  const negativeExact = [
    'no menciona',
    'no',
    'ninguna',
    'ninguno',
    'no tiene',
    'no cuenta',
    'no posee',
    'sin maestria',
    'sin posgrado'
  ];

  if (negativeExact.includes(clean)) {
    return false;
  }

  // Si comienza explícitamente con "no menciona" o similar
  for (const neg of negativeExact) {
    if (clean.startsWith(`${neg} `) || clean.startsWith(`${neg}.`) || clean.startsWith(`${neg},`)) {
      return false;
    }
  }

  return true;
};

/**
 * Normaliza y extrae un valor numérico representativo de la columna Salario.
 * Formatos soportados:
 * - "20k a 25k | (soles)" -> Se calcula el promedio del rango: (20000 + 25000) / 2 = 22,500
 * - "13k a 15k | (soles)" -> (13000 + 15000) / 2 = 14,000
 * - "Más de 30k | (soles)" -> Al ser rango abierto superior, se toma como piso 30,000 (o 33,000 con factor de proyección +10%)
 * - 25000 -> 25,000 directo
 */
export const parseSalaryNumber = (
  val: number | string | undefined | null,
  openEndedStrategy: 'conservative' | 'projected' = 'projected'
): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const str = String(val).toLowerCase().trim();

  // Caso 1: Rango explícito "20k a 25k", "20k - 25k", "20 a 25"
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*k?\s*(?:a|-)\s*(\d+(?:\.\d+)?)\s*k?/);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1]);
    let max = parseFloat(rangeMatch[2]);
    if (min < 100) min *= 1000;
    if (max < 100) max *= 1000;
    return Math.round((min + max) / 2);
  }

  // Caso 2: Rango abierto superior "Más de 30k", "> 30k", "30k a más"
  const plusMatch = str.match(/(?:mas|más|>)\s*(?:de)?\s*(\d+(?:\.\d+)?)\s*k?/);
  if (plusMatch) {
    let base = parseFloat(plusMatch[1]);
    if (base < 100) base *= 1000;
    // Si projected: 30,000 * 1.1 = 33,000 (+10% representativo de estar por encima del piso)
    // Si conservative: 30,000 exacto
    return openEndedStrategy === 'projected' ? Math.round(base * 1.1) : Math.round(base);
  }

  // Caso 3: Rango abierto inferior "Menos de 15k", "< 15k"
  const minusMatch = str.match(/(?:menos|<)\s*(?:de)?\s*(\d+(?:\.\d+)?)\s*k?/);
  if (minusMatch) {
    let base = parseFloat(minusMatch[1]);
    if (base < 100) base *= 1000;
    return Math.round(base * 0.9);
  }

  // Caso 4: Número suelto o "25k"
  const singleKMatch = str.match(/^(\d+(?:\.\d+)?)\s*k/);
  if (singleKMatch) {
    return Math.round(parseFloat(singleKMatch[1]) * 1000);
  }

  // Caso 5: Limpieza numérica pura
  const cleaned = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (!isNaN(cleaned) && cleaned > 0) {
    if (cleaned < 100 && str.includes('k')) return Math.round(cleaned * 1000);
    return Math.round(cleaned);
  }

  return 0;
};

/**
 * Normaliza y extrae un valor numérico representativo de la columna Años de Experiencia.
 * - "15 a más años" -> 15 (o 16)
 * - "7 a 10" -> 8.5
 * - "10 a 15" -> 12.5
 */
export const parseExperienceNumber = (val: number | string | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const str = String(val).toLowerCase().trim();

  // Rango "7 a 10"
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:a|-)\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    return Math.round(((min + max) / 2) * 10) / 10;
  }

  // "15 a más", "15+"
  const plusMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:a\s*mas|a\s*más|\+)/);
  if (plusMatch) {
    return parseFloat(plusMatch[1]);
  }

  const cleaned = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(cleaned) ? 0 : cleaned;
};
