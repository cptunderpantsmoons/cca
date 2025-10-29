import { supabase } from '../lib/supabase';
import type { ReportData, VerificationResult } from '../types';
import type { Database } from '../lib/database.types';

type FinancialStatement = Database['public']['Tables']['financial_statements']['Row'];
type FinancialStatementInsert = Database['public']['Tables']['financial_statements']['Insert'];

export const saveFinancialStatement = async (
  companyId: string,
  financialYearEnd: string,
  statementData: ReportData,
  verificationResult: VerificationResult,
  userId: string
): Promise<FinancialStatement> => {
  const { data, error } = await supabase
    .from('financial_statements')
    .insert({
      company_id: companyId,
      financial_year_end: financialYearEnd,
      statement_data: statementData as any,
      verification_result: verificationResult as any,
      status: 'draft',
      version: 1,
      is_current_version: true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateFinancialStatement = async (
  statementId: string,
  statementData: ReportData,
  verificationResult: VerificationResult
): Promise<FinancialStatement> => {
  const { data, error } = await supabase
    .from('financial_statements')
    .update({
      statement_data: statementData as any,
      verification_result: verificationResult as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', statementId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getFinancialStatements = async (
  companyId: string
): Promise<FinancialStatement[]> => {
  const { data, error } = await supabase
    .from('financial_statements')
    .select('*')
    .eq('company_id', companyId)
    .order('financial_year_end', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getLatestFinancialStatement = async (
  companyId: string
): Promise<FinancialStatement | null> => {
  const { data, error } = await supabase
    .from('financial_statements')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_current_version', true)
    .order('financial_year_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getPreviousYearStatement = async (
  companyId: string,
  currentYearEnd: string
): Promise<FinancialStatement | null> => {
  const { data, error } = await supabase
    .from('financial_statements')
    .select('*')
    .eq('company_id', companyId)
    .lt('financial_year_end', currentYearEnd)
    .order('financial_year_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const updateStatementStatus = async (
  statementId: string,
  status: 'draft' | 'in_review' | 'approved' | 'finalized' | 'lodged',
  userId?: string
): Promise<void> => {
  const updates: any = { status };

  if (status === 'approved' && userId) {
    updates.approved_by = userId;
    updates.approved_at = new Date().toISOString();
  } else if (status === 'in_review' && userId) {
    updates.reviewed_by = userId;
  }

  const { error } = await supabase
    .from('financial_statements')
    .update(updates)
    .eq('id', statementId);

  if (error) throw error;
};

export const logAuditEvent = async (
  companyId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValues?: any,
  newValues?: any
): Promise<void> => {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      company_id: companyId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
    });

  if (error) console.error('Failed to log audit event:', error);
};
