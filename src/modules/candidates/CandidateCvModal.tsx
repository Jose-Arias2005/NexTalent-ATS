import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Candidate2026, Application2026, Vacancy2026 } from '../../types';
import {
  FileText,
  Phone,
  GraduationCap,
  Briefcase,
  DollarSign,
  Languages,
  Building2,
  Calendar,
  ExternalLink,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { hasMasterDegree } from '../../lib/analyticsUtils';
import { safeExternalUrl } from '../../lib/security';
import { isGoogleDriveLink } from '../../lib/driveUpload';

interface CandidateCvModalProps {
  candidate: Candidate2026 | null;
  isOpen: boolean;
  onClose: () => void;
  applications: Application2026[];
  vacancies: Vacancy2026[];
  onRefresh?: () => void;
}

export const CandidateCvModal: React.FC<CandidateCvModalProps> = ({
  candidate,
  isOpen,
  onClose,
  applications,
  vacancies
}) => {
  if (!candidate) return null;

  const formatMoney = (amount: number | string | undefined | null) => {
    if (!amount) return 'No especificado';
    if (typeof amount === 'number') return `S/. ${amount.toLocaleString('es-PE')}`;
    const str = String(amount).trim();
    // If it's a descriptive text range like "20k a 25k | (soles)" or "Más de 30k | (soles)", preserve it
    if (/[a-zA-Z]/.test(str)) return str;
    const cleaned = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (!isNaN(cleaned) && cleaned > 0) return `S/. ${cleaned.toLocaleString('es-PE')}`;
    return str;
  };
  const cleanPhone = (candidate.telefono || '').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(
    candidate.nombre
  )},%20te%20contacto%20de%20NexTalent%20Executive%20Search`;

  const candidateApps = applications.map((app) => {
    const vac = vacancies.find((v) => v.id === app.vacancyId);
    return {
      ...app,
      vacancyTitle: vac ? vac.title : app.vacancyId === 'SPONTANEOUS' ? 'Postulación Espontánea' : 'Puesto General'
    };
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={candidate.nombre}
      subtitle={`DNI: ${candidate.dni} · ${candidate.actualUltimaPosicion}`}
      maxWidth="840px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header Strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: 16,
            backgroundColor: '#F8FAFC',
            borderRadius: 12,
            border: '1px solid var(--ats-border)'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Badge variant="navy">{candidate.sectorRubro}</Badge>
            <Badge variant="blue">{candidate.tipoEmpresa}</Badge>
            <Badge variant="cyan">{candidate.inglesAvanzado}</Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {candidate.telefono && (
              <a
                href={safeExternalUrl(whatsappUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="ats-btn ats-btn-sm"
                style={{
                  backgroundColor: '#25D366',
                  color: '#FFF',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <MessageSquare size={14} />
                <span>Contactar WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* 2-Column Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
              <Phone size={16} color="#0066CC" />
              <span style={{ color: 'var(--ats-text-muted)' }}>Teléfono:</span>
              <strong style={{ color: 'var(--ats-navy)' }}>{candidate.telefono || 'No registrado'}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
              <DollarSign size={16} color="#00A3E0" />
              <span style={{ color: 'var(--ats-text-muted)' }}>Sueldo Actual/Último:</span>
              <strong style={{ color: '#0066CC', fontSize: '1rem' }}>
                {formatMoney(candidate.salarioActualUltimo)} / mes
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
              <Briefcase size={16} color="#0066CC" />
              <span style={{ color: 'var(--ats-text-muted)' }}>Experiencia:</span>
              <strong style={{ color: 'var(--ats-navy)' }}>{candidate.aniosExperiencia} años</strong>
              <span style={{ color: 'var(--ats-text-muted)' }}>({candidate.edad} años de edad)</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
              <Languages size={16} color="#0066CC" />
              <span style={{ color: 'var(--ats-text-muted)' }}>Inglés Avanzado:</span>
              <strong style={{ color: 'var(--ats-navy)' }}>{candidate.inglesAvanzado}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.875rem' }}>
              <GraduationCap size={18} color="#00A3E0" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span style={{ color: 'var(--ats-text-muted)' }}>Maestría: </span>
                {hasMasterDegree(candidate.maestria) ? (
                  <strong style={{ color: '#065F46' }}>✓ {candidate.maestria}</strong>
                ) : (
                  <span style={{ color: '#6B7280' }}>{candidate.maestria || 'No menciona'}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
              <Building2 size={16} color="#0066CC" />
              <span style={{ color: 'var(--ats-text-muted)' }}>Tipo de Empresa:</span>
              <strong style={{ color: 'var(--ats-navy)' }}>{candidate.tipoEmpresa}</strong>
            </div>
          </div>
        </div>

        {/* Link del CV */}
        <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid var(--ats-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={20} color="#0066CC" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--ats-navy)' }}>Documento / Link del CV</strong>
                  {isGoogleDriveLink(candidate.linkCv) && (
                    <span
                      style={{
                        backgroundColor: '#E0F2FE',
                        color: '#0369A1',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontFamily: 'var(--ats-font-mono)'
                      }}
                    >
                      Google Drive Oficial
                    </span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--ats-text-muted)', wordBreak: 'break-all' }}>
                  {candidate.linkCv || 'Sin enlace de CV registrado'}
                </p>
              </div>
            </div>

            {candidate.linkCv && candidate.linkCv.startsWith('http') && (
              <a
                href={safeExternalUrl(candidate.linkCv)}
                target="_blank"
                rel="noopener noreferrer"
                className="ats-btn ats-btn-sm ats-btn-primary"
                style={{ flexShrink: 0 }}
              >
                <ExternalLink size={13} />
                <span>{isGoogleDriveLink(candidate.linkCv) ? 'Abrir CV en Google Drive' : 'Abrir Enlace de CV'}</span>
              </a>
            )}
          </div>
        </div>

        {/* Historial de Postulaciones Vinculadas */}
        <div>
          <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--ats-navy)', marginBottom: 12 }}>
            Postulaciones Vinculadas a este DNI ({candidateApps.length})
          </h4>

          {candidateApps.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--ats-text-muted)' }}>
              Candidato registrado en la Base General 2026+.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {candidateApps.map((app) => {
                const hasAnswers = app.customAnswers && Object.keys(app.customAnswers).length > 0;
                return (
                  <div
                    key={app.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--ats-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ats-navy)' }}>
                        {app.vacancyTitle}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ats-text-muted)', marginTop: 2 }}>
                        Postulado el {new Date(app.appliedAt).toLocaleDateString('es-PE')}
                      </div>
                    </div>

                    {hasAnswers && (
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          padding: '10px 12px',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          border: '1px dashed var(--ats-border)'
                        }}
                      >
                        <strong style={{ color: 'var(--ats-navy)', display: 'block', marginBottom: 4 }}>
                          Respuestas a preguntas del puesto:
                        </strong>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 }}>
                          {Object.entries(app.customAnswers || {}).map(([key, val]) => {
                            const linkedVac = vacancies.find((v) => v.id === app.vacancyId);
                            const qLabel = linkedVac?.customQuestions?.find((q) => q.id === key)?.label || key;
                            return (
                              <div key={key}>
                                <span style={{ color: 'var(--ats-text-muted)' }}>{qLabel}: </span>
                                <strong style={{ color: 'var(--ats-navy)' }}>{String(val)}</strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
