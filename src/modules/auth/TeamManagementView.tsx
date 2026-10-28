import React, { useState } from 'react';
import { AdminUser, AdminUserRole, AuditLogAction, AuditLogEntry, Vacancy2026 } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { storage } from '../../lib/storage';
import { hasPermission } from '../../lib/security';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Mail,
  User,
  Shield,
  Activity,
  Search,
  Lock,
  Eye,
  FileSpreadsheet,
  Building
} from 'lucide-react';

interface TeamManagementViewProps {
  users: AdminUser[];
  currentUser: AdminUser | null;
  onRefresh: () => void;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  users,
  currentUser,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminUserRole>('Consultor Senior');
  const [companyName, setCompanyName] = useState('');
  const [assignedVacancyIds, setAssignedVacancyIds] = useState<string[]>([]);
  const [availableVacancies, setAvailableVacancies] = useState<Vacancy2026[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros de Auditoría
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  const canManageUsers = hasPermission(currentUser?.role, 'manage_users');
  const auditLogs = storage.getAuditLogs();

  const handleOpenAddModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('Consultor Senior');
    setCompanyName('');
    setAssignedVacancyIds([]);
    setErrorMsg('');
    setAvailableVacancies(storage.getVacancies2026());
    setShowAddModal(true);
  };

  const handleToggleVacancyAssignment = (vacId: string) => {
    setAssignedVacancyIds((prev) =>
      prev.includes(vacId) ? prev.filter((id) => id !== vacId) : [...prev, vacId]
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!canManageUsers) {
      setErrorMsg('No tienes permisos suficientes para registrar nuevos usuarios.');
      return;
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }

    if (role === 'client' && !companyName.trim()) {
      setErrorMsg('Por favor ingresa el nombre de la Empresa Cliente (ej: Alicorp).');
      return;
    }

    if (password.trim().length < 8) {
      setErrorMsg('La contraseña debe tener un mínimo de 8 caracteres por seguridad.');
      return;
    }

    const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      setErrorMsg('Ya existe un usuario registrado con este correo.');
      return;
    }

    const newUser: AdminUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(), // StorageManager lo hasheará automáticamente con salt SHA-256
      role,
      companyName: role === 'client' ? companyName.trim() : undefined,
      assignedVacancyIds: role === 'client' ? assignedVacancyIds : undefined,
      active: true,
      createdAt: new Date().toISOString()
    };

    try {
      await storage.saveAdminUser(newUser);
      setSuccessMsg(
        role === 'client'
          ? `Empresa Cliente ${companyName} (${name}) agregada con éxito con ${assignedVacancyIds.length} proceso(s) asignado(s).`
          : `Usuario ${name} (${role}) agregado exitosamente con contraseña encriptada.`
      );
      setName('');
      setEmail('');
      setPassword('');
      setCompanyName('');
      setAssignedVacancyIds([]);
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el usuario.');
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!canManageUsers) {
      alert('Solo el SuperAdmin tiene autorización para revocar accesos.');
      return;
    }

    if (user.id === currentUser?.id) {
      alert('No puedes eliminar tu propia cuenta en sesión activa.');
      return;
    }

    if (window.confirm(`¿Estás seguro de revocar el acceso institucional a ${user.name} (${user.email})?`)) {
      try {
        await storage.deleteAdminUser(user.id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (!canManageUsers) {
      alert('Solo el SuperAdmin puede modificar el estado de las cuentas.');
      return;
    }

    if (user.id === currentUser?.id) {
      alert('No puedes desactivar tu propia cuenta en sesión activa.');
      return;
    }

    const updated = { ...user, active: !user.active };
    await storage.saveAdminUser(updated);
    onRefresh();
  };

  // Filtrado de logs de auditoría
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase());

    const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeVariant = (action: AuditLogAction) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return 'success';
      case 'LOGIN_FAILED':
      case 'DELETE_VACANCY':
      case 'DELETE_USER':
      case 'FORMAT_DATABASE':
        return 'danger';
      case 'EXPORT_EXCEL_8K':
      case 'EXPORT_EXCEL_VACANCY':
      case 'EXPORT_EXCEL_CANDIDATES':
        return 'warning';
      case 'IMPORT_CSV_VACANCY':
      case 'CREATE_USER':
        return 'blue';
      default:
        return 'navy';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header institucional */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ats-navy)', margin: '0 0 4px 0' }}>
            Equipo Autorizado & Seguridad ATS
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ats-text-secondary)' }}>
            Control de Acceso Basado en Roles (RBAC), credenciales con encriptación SHA-256 y Registro Inmutable de Auditoría.
          </p>
        </div>

        {canManageUsers && (
          <Button
            variant="primary"
            size="md"
            icon={<UserPlus size={16} />}
            onClick={handleOpenAddModal}
          >
            Agregar Usuario / Empresa Cliente
          </Button>
        )}
      </div>

      {/* Tabs de navegación */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid var(--ats-border)' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'users' ? 800 : 600,
            color: activeTab === 'users' ? 'var(--ats-blue)' : 'var(--ats-text-secondary)',
            borderBottom: activeTab === 'users' ? '3px solid var(--ats-blue)' : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Users size={16} />
          <span>Usuarios y Permisos ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'audit' ? 800 : 600,
            color: activeTab === 'audit' ? 'var(--ats-blue)' : 'var(--ats-text-secondary)',
            borderBottom: activeTab === 'audit' ? '3px solid var(--ats-blue)' : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Activity size={16} />
          <span>Registro de Auditoría de Seguridad ({auditLogs.length})</span>
        </button>
      </div>

      {/* Mensajes de éxito */}
      {successMsg && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #10B981',
            color: '#065F46',
            padding: 12,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.85rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: GESTIÓN DE USUARIOS */}
      {activeTab === 'users' && (
        <>
          {!canManageUsers && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                padding: '12px 16px',
                color: '#1E40AF',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Shield size={16} color="#0066CC" />
              <span>
                <strong>Modo Consulta (RBAC):</strong> Tu rol actual ({currentUser?.role || 'Viewer'}) cuenta con acceso de lectura. Solo el <strong>SuperAdmin</strong> tiene facultades para agregar o revocar cuentas de acceso.
              </span>
            </div>
          )}

          {/* Tabla de usuarios */}
          <div className="ats-table-container">
            <table className="ats-table">
              <thead>
                <tr>
                  <th>Nombre & Rol</th>
                  <th>Correo Corporativo</th>
                  <th>Seguridad / Clave</th>
                  <th>Estado</th>
                  <th>Fecha Creación</th>
                  {canManageUsers && <th style={{ textAlign: 'right' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === currentUser?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: '#1B2A4A',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.78rem'
                            }}
                          >
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ats-navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {u.name}
                              {isMe && <Badge variant="blue">Tú</Badge>}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: 2 }}>
                              {u.role === 'client' ? (
                                <div>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      backgroundColor: '#EEF2FF',
                                      color: '#4338CA',
                                      border: '1px solid #C7D2FE',
                                      borderRadius: 4,
                                      padding: '2px 8px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700
                                    }}
                                  >
                                    🏢 Empresa Cliente
                                  </span>
                                  {u.companyName && (
                                    <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>
                                      Empresa: <strong style={{ color: '#0A1120' }}>{u.companyName}</strong>{' '}
                                      <span style={{ color: '#0052CC' }}>
                                        ({u.assignedVacancyIds?.length || 0} procesos asignados)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge
                                  variant={
                                    u.role === 'SuperAdmin'
                                      ? 'navy'
                                      : u.role === 'Consultor Senior'
                                      ? 'cyan'
                                      : u.role === 'Reclutador'
                                      ? 'blue'
                                      : 'warning'
                                  }
                                >
                                  {u.role}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <a
                          href={`mailto:${u.email}`}
                          style={{ color: 'var(--ats-blue)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          {u.email}
                        </a>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            color: '#059669',
                            backgroundColor: '#ECFDF5',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #A7F3D0'
                          }}
                        >
                          <Lock size={12} />
                          <span>SHA-256 (Salted)</span>
                        </span>
                      </td>
                      <td>
                        <Badge variant={u.active ? 'success' : 'danger'}>
                          {u.active ? 'Activo' : 'Suspendido'}
                        </Badge>
                      </td>
                      <td style={{ color: 'var(--ats-text-muted)', fontSize: '0.82rem' }}>
                        {new Date(u.createdAt).toLocaleDateString('es-PE')}
                      </td>
                      {canManageUsers && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isMe}
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.active ? 'Suspender' : 'Activar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isMe}
                              icon={<Trash2 size={14} color="#EF4444" />}
                              onClick={() => handleDeleteUser(u)}
                              title="Revocar acceso"
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Controles de búsqueda y filtros */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 10 }} />
                <input
                  type="text"
                  className="ats-input"
                  style={{ paddingLeft: 32, fontSize: '0.85rem' }}
                  placeholder="Buscar por usuario o detalle..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>

              <select
                className="ats-select"
                style={{ width: 200, fontSize: '0.85rem' }}
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
              >
                <option value="all">Todas las Acciones</option>
                <option value="LOGIN_SUCCESS">Inicios de Sesión</option>
                <option value="LOGIN_FAILED">Intentos Fallidos</option>
                <option value="EXPORT_EXCEL_VACANCY">Exportaciones Vacantes</option>
                <option value="EXPORT_EXCEL_CANDIDATES">Exportaciones Candidatos</option>
                <option value="IMPORT_CSV_VACANCY">Importaciones CSV</option>
                <option value="DELETE_VACANCY">Eliminaciones de Vacantes</option>
                <option value="CREATE_USER">Creación de Usuarios</option>
                <option value="FORMAT_DATABASE">Formateo de Base de Datos</option>
              </select>
            </div>

            <span style={{ fontSize: '0.8rem', color: 'var(--ats-text-muted)' }}>
              Mostrando {filteredAuditLogs.length} de {auditLogs.length} registros
            </span>
          </div>

          {/* Tabla de auditoría */}
          <div className="ats-table-container">
            <table className="ats-table">
              <thead>
                <tr>
                  <th style={{ width: 170 }}>Fecha & Hora</th>
                  <th style={{ width: 180 }}>Usuario</th>
                  <th style={{ width: 140 }}>Rol</th>
                  <th style={{ width: 190 }}>Acción</th>
                  <th>Detalle / Impacto</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ats-text-muted)' }}>
                      No se encontraron registros de auditoría con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--ats-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString('es-PE')}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ats-navy)', fontSize: '0.85rem' }}>
                        {log.userName}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                          {log.userRole}
                        </span>
                      </td>
                      <td>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--ats-navy)' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Agregar Usuario */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Registrar Usuario en Equipo Autorizado"
          subtitle="Asigna permisos según el rol institucional. La contraseña será encriptada con SHA-256."
          maxWidth="500px"
        >
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMsg && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: 10,
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="ats-input-group" style={{ margin: 0 }}>
              <label className="ats-label">Nombre Completo</label>
              <input
                type="text"
                className="ats-input"
                placeholder="Ej: Claudia Morales"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="ats-input-group" style={{ margin: 0 }}>
              <label className="ats-label">Correo Corporativo</label>
              <input
                type="email"
                className="ats-input"
                placeholder="consultor@talentats.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="ats-input-group" style={{ margin: 0 }}>
              <label className="ats-label">Contraseña Temporal (Mín. 8 caracteres)</label>
              <input
                type="password"
                className="ats-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="ats-input-group" style={{ margin: 0 }}>
              <label className="ats-label">Rol y Nivel de Acceso (RBAC)</label>
              <select
                className="ats-select"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminUserRole)}
              >
                <option value="Consultor Senior">Consultor Senior (Gestión de vacantes, candidatos y exportación)</option>
                <option value="Reclutador">Reclutador (Operación estándar de procesos)</option>
                <option value="Viewer">Viewer (Solo lectura, tablas y estadísticas)</option>
                <option value="client">Empresa Cliente (client - Acceso exclusivo al Portal Ejecutivo)</option>
                <option value="SuperAdmin">SuperAdmin (Control total, usuarios, formateo de BD)</option>
              </select>
            </div>

            {role === 'client' && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0052CC', fontWeight: 700, fontSize: 13 }}>
                  <Building size={16} />
                  <span>Configuración de Empresa Cliente</span>
                </div>

                <div className="ats-input-group" style={{ margin: 0 }}>
                  <label className="ats-label">Nombre de la Empresa Cliente</label>
                  <input
                    type="text"
                    className="ats-input"
                    placeholder="Ej: Alicorp, Backus, BCP..."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required={role === 'client'}
                  />
                </div>

                <div className="ats-input-group" style={{ margin: 0 }}>
                  <label className="ats-label">
                    Procesos 2026 Asignados a esta Empresa ({assignedVacancyIds.length} seleccionados)
                  </label>
                  <div
                    style={{
                      maxHeight: 160,
                      overflowY: 'auto',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      backgroundColor: '#FFFFFF',
                      padding: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    {availableVacancies.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#94A3B8', padding: 8 }}>
                        No hay procesos 2026 registrados en el sistema.
                      </div>
                    ) : (
                      availableVacancies.map((v) => {
                        const isChecked = assignedVacancyIds.includes(v.id);
                        return (
                          <label
                            key={v.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 12,
                              padding: '5px 8px',
                              borderRadius: 4,
                              backgroundColor: isChecked ? '#EFF6FF' : 'transparent',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleVacancyAssignment(v.id)}
                            />
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0052CC' }}>
                              {v.code}
                            </span>
                            <span style={{ fontWeight: 600, color: '#0A1120' }}>{v.title}</span>
                            <span style={{ color: '#64748B', fontSize: 11 }}>({v.sector})</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    El cliente solo podrá auditar los candidatos y analítica de los procesos seleccionados.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10 }}>
              <Button variant="outline" size="md" type="button" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" type="submit">
                Crear Usuario Seguro
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
