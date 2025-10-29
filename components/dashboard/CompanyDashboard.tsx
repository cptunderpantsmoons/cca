import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';

type Company = Database['public']['Tables']['companies']['Row'];

interface CompanyDashboardProps {
  onSelectCompany: (company: Company) => void;
  onCreateNew: () => void;
}

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ onSelectCompany, onCreateNew }) => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      proprietary_limited: 'Pty Ltd',
      public_company: 'Public Company',
      trust: 'Trust',
      partnership: 'Partnership',
      sole_trader: 'Sole Trader'
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Companies</h1>
          <p className="text-gray-400 mt-2">
            Welcome back, {profile?.full_name}. Select a company to generate financial statements.
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Company
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {companies.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Companies Yet</h3>
          <p className="text-gray-400 mb-6">Get started by adding your first company</p>
          <button
            onClick={onCreateNew}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Your First Company
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => onSelectCompany(company)}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-sky-500 hover:shadow-lg hover:shadow-sky-900/20 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{company.name}</h3>
                  <span className="inline-block px-2 py-1 text-xs font-semibold text-sky-400 bg-sky-900/50 rounded">
                    {getEntityTypeLabel(company.entity_type)}
                  </span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              <div className="space-y-2 text-sm">
                {company.abn && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-semibold">ABN:</span>
                    <span>{company.abn}</span>
                  </div>
                )}
                {company.acn && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-semibold">ACN:</span>
                    <span>{company.acn}</span>
                  </div>
                )}
                {company.industry_sector && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-semibold">Industry:</span>
                    <span>{company.industry_sector}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="font-semibold">FY End:</span>
                  <span>{company.financial_year_end}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;
