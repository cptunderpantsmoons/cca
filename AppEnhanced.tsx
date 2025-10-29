import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import SignUpForm from './components/auth/SignUpForm';
import CompanyDashboard from './components/dashboard/CompanyDashboard';
import AddCompanyForm from './components/dashboard/AddCompanyForm';
import App from './App';
import type { Database } from './lib/database.types';

type Company = Database['public']['Tables']['companies']['Row'];

type ViewMode = 'auth' | 'dashboard' | 'add-company' | 'generate-report';

const AppContent: React.FC = () => {
  const { user, profile, loading, signIn, signUp, signOut } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center p-4">
        <div className="w-full">
          {authMode === 'login' ? (
            <LoginForm
              onLogin={signIn}
              onToggleMode={() => setAuthMode('signup')}
            />
          ) : (
            <SignUpForm
              onSignUp={signUp}
              onToggleMode={() => setAuthMode('login')}
            />
          )}
        </div>
      </div>
    );
  }

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setViewMode('generate-report');
  };

  const handleBackToDashboard = () => {
    setSelectedCompany(null);
    setViewMode('dashboard');
  };

  const handleAddCompanySuccess = () => {
    setViewMode('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(viewMode === 'generate-report' || viewMode === 'add-company') && (
              <button
                onClick={handleBackToDashboard}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-bold text-white">AASB Financial Statements</h1>
            {selectedCompany && viewMode === 'generate-report' && (
              <span className="text-gray-400">— {selectedCompany.name}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{profile.full_name}</div>
              <div className="text-xs text-gray-400">{profile.role}</div>
            </div>
            <button
              onClick={signOut}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        {viewMode === 'dashboard' && (
          <CompanyDashboard
            onSelectCompany={handleSelectCompany}
            onCreateNew={() => setViewMode('add-company')}
          />
        )}

        {viewMode === 'add-company' && (
          <AddCompanyForm
            onSuccess={handleAddCompanySuccess}
            onCancel={handleBackToDashboard}
          />
        )}

        {viewMode === 'generate-report' && selectedCompany && (
          <App companyId={selectedCompany.id} companyName={selectedCompany.name} />
        )}
      </main>
    </div>
  );
};

const AppEnhanced: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default AppEnhanced;
