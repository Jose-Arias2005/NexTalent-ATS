import React, { useState, useEffect } from 'react';
import {
  Vacancy2026,
  Candidate2026,
  Application2026,
  HistoricalCandidate8k,
  AdminUser
} from './types';
import { storage } from './lib/storage';

// Layouts
import { PublicLayout } from './app/PublicLayout';
import { AdminLayout } from './app/AdminLayout';

// Modules
import { LandingView } from './modules/landing/LandingView';
import { PublicVacanciesView } from './modules/vacancies/PublicVacanciesView';
import { AdminVacanciesView } from './modules/vacancies/AdminVacanciesView';
import { AdminVacancyDetailView } from './modules/vacancies/AdminVacancyDetailView';
import { AdminCandidatesView } from './modules/candidates/AdminCandidatesView';
import { AdminAnalyticsView } from './modules/analytics/AdminAnalyticsView';
import { AdminHistorical8kView } from './modules/historical-8k/AdminHistorical8kView';
import { LoginView } from './modules/auth/LoginView';
import { TeamManagementView } from './modules/auth/TeamManagementView';
import { JobApplicationPageView } from './modules/vacancies/JobApplicationPageView';
import { ClientPortalView } from './modules/client-portal/ClientPortalView';

// Modals
import { ApplicationFormModal } from './modules/vacancies/ApplicationFormModal';
import { CreateVacancyModal } from './modules/vacancies/CreateVacancyModal';

export const App: React.FC = () => {
  // Navigation Router State
  const [currentView, setCurrentView] = useState<string>('landing');
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  // Reactive IndexedDB State
  const [historical8k, setHistorical8k] = useState<HistoricalCandidate8k[]>([]);
  const [vacancies2026, setVacancies2026] = useState<Vacancy2026[]>([]);
  const [candidates2026, setCandidates2026] = useState<Candidate2026[]>([]);
  const [applications2026, setApplications2026] = useState<Application2026[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Modals state
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [appModalVacancy, setAppModalVacancy] = useState<Vacancy2026 | null>(null);
  const [isCreateVacancyOpen, setIsCreateVacancyOpen] = useState(false);

  // Sync state with storage
  const syncWithStorage = () => {
    setHistorical8k(storage.getHistorical8k());
    setVacancies2026(storage.getVacancies2026());
    setCandidates2026(storage.getCandidates2026());
    setApplications2026(storage.getApplications2026());
    setAdminUsers(storage.getAdminUsers());
    setCurrentUser(storage.getCurrentUser());
  };

  useEffect(() => {
    storage.init().then(() => {
      syncWithStorage();

      // Check if URL has ?job=[id] or #/postular/[id]
      const urlParams = new URLSearchParams(window.location.search);
      const jobParam = urlParams.get('job');
      if (jobParam) {
        setSelectedVacancyId(jobParam);
        setCurrentView('job-apply-page');
      } else if (window.location.hash.startsWith('#/postular/')) {
        const id = window.location.hash.replace('#/postular/', '');
        if (id) {
          setSelectedVacancyId(decodeURIComponent(id));
          setCurrentView('job-apply-page');
        }
      } else if (
        window.location.pathname.includes('/admin') ||
        window.location.hash === '#admin'
      ) {
        const user = storage.getCurrentUser();
        if (user) {
          setCurrentView('admin-vacancies');
        } else {
          setCurrentView('login');
        }
      }
    });

    const unsubscribe = storage.subscribe(syncWithStorage);
    return () => unsubscribe();
  }, []);

  // Listener for URL / hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      if (window.location.hash === '#admin') {
        const user = storage.getCurrentUser();
        if (user) {
          setCurrentView('admin-vacancies');
        } else {
          setCurrentView('login');
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const jobParam = params.get('job');
      if (jobParam) {
        setSelectedVacancyId(jobParam);
        setCurrentView('job-apply-page');
        return;
      }

      if (window.location.hash.startsWith('#/postular/')) {
        const id = window.location.hash.replace('#/postular/', '');
        if (id) {
          setSelectedVacancyId(decodeURIComponent(id));
          setCurrentView('job-apply-page');
          return;
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        const user = storage.getCurrentUser();
        setCurrentView(user ? 'admin-vacancies' : 'login');
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handlers
  const handleNavigate = (view: string, vacancyId?: string) => {
    if (view.startsWith('admin-') && !currentUser) {
      setCurrentView('login');
      return;
    }
    setCurrentView(view);
    if (vacancyId) setSelectedVacancyId(vacancyId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSpontaneous = () => {
    setAppModalVacancy(null);
    setIsAppModalOpen(true);
  };

  const handleOpenApplyVacancy = (vacancy: Vacancy2026) => {
    setSelectedVacancyId(vacancy.id);
    setCurrentView('job-apply-page');
    const url = new URL(window.location.href);
    url.searchParams.set('job', vacancy.id);
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    setCurrentView('admin-vacancies');
    window.location.hash = 'admin';
  };

  const handleLogout = async () => {
    await storage.logout();
    setCurrentUser(null);
    setCurrentView('landing');
    window.location.hash = '';
  };

  const isAdminView = currentView.startsWith('admin-');
  const activeVacanciesCount = vacancies2026.filter((v) => v.status === 'active').length;
  const currentSelectedVacancy = vacancies2026.find((v) => v.id === selectedVacancyId);

  // If user requested login view
  if (currentView === 'login') {
    return (
      <LoginView
        onSuccess={handleLoginSuccess}
        onBackToPublic={() => {
          setCurrentView('landing');
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <>
      {isAdminView && currentUser ? (
        currentUser.role === 'client' ? (
          <ClientPortalView
            currentUser={currentUser}
            vacancies={vacancies2026}
            candidates={candidates2026}
            applications={applications2026}
            onLogout={handleLogout}
            onRefresh={syncWithStorage}
          />
        ) : (
          <AdminLayout
            activeNav={currentView}
            onNavigate={handleNavigate}
            onOpenCreateVacancy={() => setIsCreateVacancyOpen(true)}
            currentUser={currentUser}
            onLogout={handleLogout}
            totalHistorical8k={historical8k.length}
            totalCandidates2026={candidates2026.length}
            activeVacanciesCount={activeVacanciesCount}
            totalVacanciesCount={vacancies2026.length}
            onRefresh={syncWithStorage}
          >
            {/* SECCIÓN A: BASE HISTÓRICA */}
            {currentView === 'admin-historical' && (
              <AdminHistorical8kView
                historicalData={historical8k}
                onRefresh={syncWithStorage}
              />
            )}

            {/* SECCIÓN B: PROCESOS 2026+ */}
            {currentView === 'admin-vacancies' && (
              <AdminVacanciesView
                vacancies={vacancies2026}
                applications={applications2026}
                onSelectVacancyDetail={(id) => {
                  setSelectedVacancyId(id);
                  setCurrentView('admin-vacancy-detail');
                }}
                onOpenCreateModal={() => setIsCreateVacancyOpen(true)}
                onRefresh={syncWithStorage}
              />
            )}

            {currentView === 'admin-vacancy-detail' && currentSelectedVacancy && (
              <AdminVacancyDetailView
                vacancy={currentSelectedVacancy}
                candidates={candidates2026}
                applications={applications2026}
                onBack={() => setCurrentView('admin-vacancies')}
                onRefresh={syncWithStorage}
              />
            )}

            {currentView === 'admin-candidates' && (
              <AdminCandidatesView
                candidates={candidates2026}
                vacancies={vacancies2026}
                applications={applications2026}
                onRefresh={syncWithStorage}
              />
            )}

            {currentView === 'admin-analytics' && (
              <AdminAnalyticsView
                candidates={candidates2026}
                vacancies={vacancies2026}
              />
            )}

            {/* SECCIÓN C: EQUIPO AUTORIZADO Y SEGURIDAD */}
            {currentView === 'admin-team' && (
              <TeamManagementView
                users={adminUsers}
                currentUser={currentUser}
                onRefresh={syncWithStorage}
              />
            )}
          </AdminLayout>
        )
      ) : (
        <PublicLayout
          activeNav={currentView}
          onNavigate={handleNavigate}
          onOpenSpontaneous={handleOpenSpontaneous}
          onOpenAdminLogin={() => setCurrentView('login')}
          activeVacanciesCount={activeVacanciesCount}
        >
          {/* Public Views */}
          {currentView === 'landing' && (
            <LandingView
              vacancies={vacancies2026}
              onSelectVacancy={handleOpenApplyVacancy}
              onOpenSpontaneous={handleOpenSpontaneous}
              onNavigateToVacancies={() => handleNavigate('public-vacancies')}
            />
          )}

          {currentView === 'public-vacancies' && (
            <PublicVacanciesView
              vacancies={vacancies2026}
              onSelectVacancy={handleOpenApplyVacancy}
              onOpenSpontaneous={handleOpenSpontaneous}
              onBackToHome={() => handleNavigate('landing')}
            />
          )}

          {/* Dedicated Executive Application Page for Direct Links */}
          {currentView === 'job-apply-page' && (
            <JobApplicationPageView
              vacancy={currentSelectedVacancy}
              onNavigateHome={() => {
                handleNavigate('landing');
                const url = new URL(window.location.href);
                url.searchParams.delete('job');
                window.history.pushState({}, '', url.pathname + (window.location.hash.startsWith('#admin') ? '#admin' : ''));
              }}
              onOpenSpontaneous={handleOpenSpontaneous}
              onSuccessSubmit={syncWithStorage}
            />
          )}
        </PublicLayout>
      )}

      {/* Global Application Modal (12 fixed fields A-L + dynamic questions + CV Link) */}
      <ApplicationFormModal
        vacancy={appModalVacancy}
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        onSuccess={syncWithStorage}
      />

      {/* Admin Create Vacancy Modal */}
      <CreateVacancyModal
        isOpen={isCreateVacancyOpen}
        onClose={() => setIsCreateVacancyOpen(false)}
        onSuccess={syncWithStorage}
      />
    </>
  );
};

export default App;
