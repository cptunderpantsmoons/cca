import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type EntityType = Database['public']['Tables']['companies']['Row']['entity_type'];

interface AddCompanyFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AddCompanyForm: React.FC<AddCompanyFormProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    abn: '',
    acn: '',
    entity_type: 'proprietary_limited' as EntityType,
    industry_sector: '',
    registered_address: '',
    principal_place_of_business: '',
    financial_year_end: '06-30',
    reporting_entity_status: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('companies')
        .insert({
          ...formData,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800 shadow-lg rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add New Company</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">ABN</label>
              <input
                type="text"
                value={formData.abn}
                onChange={(e) => handleChange('abn', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="12 345 678 901"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">ACN</label>
              <input
                type="text"
                value={formData.acn}
                onChange={(e) => handleChange('acn', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="123 456 789"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Entity Type <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.entity_type}
              onChange={(e) => handleChange('entity_type', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            >
              <option value="proprietary_limited">Proprietary Limited (Pty Ltd)</option>
              <option value="public_company">Public Company</option>
              <option value="trust">Trust</option>
              <option value="partnership">Partnership</option>
              <option value="sole_trader">Sole Trader</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Industry Sector</label>
            <input
              type="text"
              value={formData.industry_sector}
              onChange={(e) => handleChange('industry_sector', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g., Manufacturing, Retail, Professional Services"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Registered Address</label>
            <textarea
              value={formData.registered_address}
              onChange={(e) => handleChange('registered_address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Principal Place of Business</label>
            <textarea
              value={formData.principal_place_of_business}
              onChange={(e) => handleChange('principal_place_of_business', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Financial Year End <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.financial_year_end}
              onChange={(e) => handleChange('financial_year_end', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="MM-DD (e.g., 06-30 for June 30)"
              pattern="[0-1][0-9]-[0-3][0-9]"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Format: MM-DD (e.g., 06-30 for June 30)</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="reporting_entity"
              checked={formData.reporting_entity_status}
              onChange={(e) => handleChange('reporting_entity_status', e.target.checked)}
              className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500"
            />
            <label htmlFor="reporting_entity" className="ml-2 text-sm text-gray-300">
              This is a reporting entity
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyForm;
