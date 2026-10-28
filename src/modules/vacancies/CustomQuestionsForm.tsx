import React from 'react';
import { CustomQuestion } from '../../types';
import { HelpCircle, CheckSquare, List, MessageSquare, ChevronDown } from 'lucide-react';

interface CustomQuestionsFormProps {
  questions: CustomQuestion[];
  values: Record<string, any>;
  onChange: (questionId: string, val: any) => void;
}

/**
 * Validador para preguntas personalizadas
 * Retorna string con el error o null si todas están conformes
 */
export function validateCustomQuestions(
  questions: CustomQuestion[] | undefined,
  values: Record<string, any>
): string | null {
  if (!questions || questions.length === 0) return null;

  for (const q of questions) {
    const val = values[q.id];

    if (q.type === 'text') {
      if (q.required && (!val || !String(val).trim())) {
        return `Por favor completa la respuesta para: "${q.label}".`;
      }
    } else if (q.type === 'select') {
      if (q.required && (!val || !String(val).trim())) {
        return `Por favor selecciona una opción para: "${q.label}".`;
      }
    } else if (q.type === 'multiselect') {
      const selected = Array.isArray(val) ? val : [];
      if (q.required && selected.length === 0) {
        return `Por favor selecciona al menos una opción para: "${q.label}".`;
      }
    } else if (q.type === 'boolean') {
      if (q.required && (val !== 'Sí' && val !== 'No')) {
        return `Por favor responde Sí o No para: "${q.label}".`;
      }
    } else if (q.type === 'boolean_with_details') {
      const choice = typeof val === 'object' && val !== null ? val.choice : val;
      const details = typeof val === 'object' && val !== null ? val.details : '';

      if (q.required && (!choice || (choice !== 'Sí' && choice !== 'No'))) {
        return `Por favor responde Sí o No para: "${q.label}".`;
      }
      if (choice === 'Sí' && (!details || !details.trim())) {
        return `Por favor especifica los detalles requeridos en: "${q.label}".`;
      }
    }
  }

  return null;
}

/**
 * Serializador que convierte los tipos de respuestas a strings limpios
 * para almacenamiento en IndexedDB, visualización en tablas y exportación a Excel
 */
export function serializeCustomAnswers(
  questions: CustomQuestion[] | undefined,
  values: Record<string, any>
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!questions || questions.length === 0) return result;

  for (const q of questions) {
    const raw = values[q.id];

    if (q.type === 'multiselect') {
      const arr = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw ? [raw] : []);
      result[q.id] = arr.join(', ');
    } else if (q.type === 'boolean_with_details') {
      if (typeof raw === 'object' && raw !== null) {
        if (raw.choice === 'Sí') {
          const detail = raw.details ? String(raw.details).trim() : '';
          result[q.id] = detail ? `Sí - ${detail}` : 'Sí';
        } else if (raw.choice === 'No') {
          result[q.id] = 'No';
        } else {
          result[q.id] = '';
        }
      } else if (typeof raw === 'string') {
        result[q.id] = raw;
      } else {
        result[q.id] = '';
      }
    } else if (raw !== undefined && raw !== null) {
      result[q.id] = String(raw).trim();
    } else {
      result[q.id] = '';
    }
  }

  return result;
}

export const CustomQuestionsForm: React.FC<CustomQuestionsFormProps> = ({
  questions,
  values,
  onChange
}) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {questions.map((q, idx) => {
        const val = values[q.id];

        return (
          <div
            key={q.id}
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              padding: 18,
              border: '1px solid var(--ats-border)',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Cabecera de la pregunta */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <label
                  className="ats-label"
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: 'var(--ats-navy)',
                    marginBottom: 4,
                    lineHeight: 1.4
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--ats-blue)',
                      color: '#FFFFFF',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      borderRadius: 4,
                      padding: '2px 6px',
                      marginRight: 8
                    }}
                  >
                    P{idx + 1}
                  </span>
                  {q.label} {q.required && <span style={{ color: '#EF4444' }}>*</span>}
                </label>

                {q.type === 'multiselect' && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#E0F2FE',
                      color: '#0284C7',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Múltiple
                  </span>
                )}
                {q.type === 'select' && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Selección
                  </span>
                )}
                {q.type === 'boolean_with_details' && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#FEF3C7',
                      color: '#D97706',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Sí/No + Detalle
                  </span>
                )}
              </div>

              {q.type === 'multiselect' && (
                <div style={{ fontSize: '0.78rem', color: 'var(--ats-text-muted)', marginTop: 2 }}>
                  Selecciona una o más opciones que apliquen a tu perfil profesional.
                </div>
              )}
            </div>

            {/* Renderizado según el tipo de pregunta */}

            {/* 1. TEXTO LIBRE */}
            {q.type === 'text' && (
              <textarea
                className="ats-input"
                rows={3}
                placeholder="Describe tu experiencia específica sobre este requerimiento..."
                value={val || ''}
                onChange={(e) => onChange(q.id, e.target.value)}
                required={q.required}
                style={{ resize: 'vertical' }}
              />
            )}

            {/* 2. SELECCIÓN ÚNICA (DROPDOWN) */}
            {q.type === 'select' && (
              <div style={{ position: 'relative' }}>
                <select
                  className="ats-select"
                  value={val || ''}
                  onChange={(e) => onChange(q.id, e.target.value)}
                  required={q.required}
                  style={{
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Selecciona una opción --</option>
                  {(q.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. SELECCIÓN MÚLTIPLE (CHECKBOXES / CARDS) */}
            {q.type === 'multiselect' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10
                }}
              >
                {(q.options || []).map((opt) => {
                  const selectedList: string[] = Array.isArray(val) ? val : [];
                  const isChecked = selectedList.includes(opt);

                  return (
                    <label
                      key={opt}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: isChecked ? '2px solid var(--ats-blue)' : '1px solid #CBD5E1',
                        backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isChecked ? '0 1px 3px rgba(0, 102, 204, 0.15)' : 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = isChecked
                            ? selectedList.filter((item) => item !== opt)
                            : [...selectedList, opt];
                          onChange(q.id, next);
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: 'var(--ats-blue)',
                          cursor: 'pointer'
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: isChecked ? 700 : 500,
                          color: isChecked ? 'var(--ats-blue)' : 'var(--ats-navy)',
                          userSelect: 'none'
                        }}
                      >
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* 4. SÍ / NO (SIMPLE) */}
            {q.type === 'boolean' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--ats-navy)'
                  }}
                >
                  <input
                    type="radio"
                    name={`custom-bool-${q.id}`}
                    value="Sí"
                    checked={val === 'Sí'}
                    onChange={() => onChange(q.id, 'Sí')}
                    style={{ width: 18, height: 18, accentColor: 'var(--ats-blue)', cursor: 'pointer' }}
                  />
                  <span>Sí</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--ats-navy)'
                  }}
                >
                  <input
                    type="radio"
                    name={`custom-bool-${q.id}`}
                    value="No"
                    checked={val === 'No'}
                    onChange={() => onChange(q.id, 'No')}
                    style={{ width: 18, height: 18, accentColor: 'var(--ats-blue)', cursor: 'pointer' }}
                  />
                  <span>No</span>
                </label>
              </div>
            )}

            {/* 5. SÍ / NO CON CAJA DE ESPECIFICACIÓN AL RESPONDER SÍ (COMO MAESTRÍA) */}
            {q.type === 'boolean_with_details' && (() => {
              const choice = typeof val === 'object' && val !== null ? val.choice : val;
              const details = typeof val === 'object' && val !== null ? val.details : '';
              const isYes = choice === 'Sí';
              const isNo = choice === 'No';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--ats-navy)'
                      }}
                    >
                      <input
                        type="radio"
                        name={`custom-bwd-${q.id}`}
                        value="Sí"
                        checked={isYes}
                        onChange={() =>
                          onChange(q.id, {
                            choice: 'Sí',
                            details: details || ''
                          })
                        }
                        style={{ width: 18, height: 18, accentColor: 'var(--ats-blue)', cursor: 'pointer' }}
                      />
                      <span>Sí</span>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--ats-navy)'
                      }}
                    >
                      <input
                        type="radio"
                        name={`custom-bwd-${q.id}`}
                        value="No"
                        checked={isNo}
                        onChange={() =>
                          onChange(q.id, {
                            choice: 'No',
                            details: ''
                          })
                        }
                        style={{ width: 18, height: 18, accentColor: 'var(--ats-blue)', cursor: 'pointer' }}
                      />
                      <span>No</span>
                    </label>
                  </div>

                  {/* Caja condicional desplegable idéntica a Maestría */}
                  {isYes && (
                    <div
                      style={{
                        marginTop: 4,
                        backgroundColor: '#FFFFFF',
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: '1.5px solid #93C5FD',
                        boxShadow: '0 2px 6px rgba(0, 102, 204, 0.08)',
                        animation: 'fadeIn 0.2s ease-in-out'
                      }}
                    >
                      <label
                        className="ats-label"
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--ats-navy)',
                          marginBottom: 6,
                          display: 'block'
                        }}
                      >
                        {q.specifyPlaceholder || 'Por favor especifica los detalles'} <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="ats-input"
                        placeholder={q.specifyPlaceholder || 'Ingresa los detalles aquí...'}
                        value={details}
                        onChange={(e) =>
                          onChange(q.id, {
                            choice: 'Sí',
                            details: e.target.value
                          })
                        }
                        required
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
};
