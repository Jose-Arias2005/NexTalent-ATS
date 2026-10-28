import React, { useState, useEffect } from 'react';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { storage } from '../../lib/storage';
import { AdminUser } from '../../types';
import { getLoginThrottleStatus } from '../../lib/security';
import { Lock, Mail, KeyRound, AlertCircle, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';

interface LoginViewProps {
  onSuccess: (user: AdminUser) => void;
  onBackToPublic: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onBackToPublic }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  // Comprobar estado de bloqueo por intentos fallidos
  useEffect(() => {
    const status = getLoginThrottleStatus();
    if (status.isLocked) {
      setLockSeconds(status.remainingSeconds);
    }
  }, []);

  // Contador regresivo en tiempo real si el acceso está bloqueado
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockSeconds]);

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockSeconds > 0) return;

    setErrorMsg('');
    setIsLoading(true);

    try {
      const user = await storage.login(email, password);
      if (user) {
        onSuccess(user);
      } else {
        const throttle = getLoginThrottleStatus();
        if (throttle.isLocked) {
          setLockSeconds(throttle.remainingSeconds);
        }
        setErrorMsg('Credenciales inválidas. Verifica tu correo corporativo y contraseña.');
      }
    } catch (err: any) {
      const throttle = getLoginThrottleStatus();
      if (throttle.isLocked) {
        setLockSeconds(throttle.remainingSeconds);
      }
      setErrorMsg(err.message || 'Error al conectar con el sistema de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormLocked = lockSeconds > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #111D36 0%, #1B2A4A 60%, #172544 100%)',
        padding: 24,
        position: 'relative'
      }}
    >
      {/* Botón de retorno al portal público */}
      <button
        onClick={onBackToPublic}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#E2E8F0',
          padding: '8px 14px',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.85rem',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
      >
        <ArrowLeft size={16} />
        <span>Volver a la Web Corporativa</span>
      </button>

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Cabecera institucional ATS */}
        <div
          style={{
            backgroundColor: '#1B2A4A',
            padding: '28px 24px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Logo size="lg" variant="light" />
          <div
            style={{
              color: '#00A3E0',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 10
            }}
          >
            Panel Interno ATS & Base de Talento
          </div>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} style={{ padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ats-navy)', margin: '0 0 6px 0' }}>
              Acceso Autorizado
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--ats-text-muted)' }}>
              Ingresa tus credenciales institucionales para gestionar los procesos de selección ejecutiva.
            </p>
          </div>

          {/* Banner de bloqueo por intentos fallidos */}
          {isFormLocked && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: '12px 14px',
                color: '#991B1B',
                fontSize: '0.82rem',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 600
              }}
            >
              <Clock size={20} color="#DC2626" style={{ flexShrink: 0 }} />
              <div>
                Acceso bloqueado por seguridad. Intenta nuevamente en{' '}
                <strong style={{ textDecoration: 'underline' }}>{formatCountdown(lockSeconds)}</strong> min.
              </div>
            </div>
          )}

          {errorMsg && !isFormLocked && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#991B1B',
                fontSize: '0.82rem',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="ats-input-group" style={{ marginBottom: 18 }}>
            <label className="ats-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} color="#0066CC" />
              <span>Correo Corporativo</span>
            </label>
            <input
              type="email"
              className="ats-input"
              placeholder="admin@talentats.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isFormLocked || isLoading}
              autoComplete="username"
              required
            />
          </div>

          <div className="ats-input-group" style={{ marginBottom: 24 }}>
            <label className="ats-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyRound size={14} color="#0066CC" />
              <span>Contraseña</span>
            </label>
            <input
              type="password"
              className="ats-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isFormLocked || isLoading}
              autoComplete="current-password"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={<Lock size={16} />}
            style={{ width: '100%', justifyContent: 'center' }}
            isLoading={isLoading}
            disabled={isFormLocked}
          >
            {isFormLocked ? `Bloqueado (${formatCountdown(lockSeconds)})` : 'Ingresar al Panel ATS'}
          </Button>

          {/* Sello de seguridad institucional */}
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: '0.75rem',
              color: 'var(--ats-text-muted)'
            }}
          >
            <ShieldCheck size={14} color="#10B981" />
            <span>Conexión protegida con firma criptográfica y rate limiting.</span>
          </div>
        </form>
      </div>
    </div>
  );
};
