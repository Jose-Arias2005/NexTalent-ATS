import { Vacancy2026, Candidate2026, Application2026, HistoricalCandidate8k, AdminUser } from '../types';

export const INITIAL_VACANCIES: Vacancy2026[] = [];
export const INITIAL_CANDIDATES_2026: Candidate2026[] = [];
export const INITIAL_APPLICATIONS_2026: Application2026[] = [];
export const INITIAL_HISTORICAL_8K: HistoricalCandidate8k[] = [];

// Usuario inicial SuperAdmin por defecto
export const DEFAULT_SUPERADMIN: AdminUser = {
  id: 'usr-superadmin-01',
  name: 'SuperAdmin',
  email: 'admin@talentats.com',
  password: 'Admin2026*Executive',
  role: 'SuperAdmin',
  active: true,
  createdAt: new Date().toISOString()
};
