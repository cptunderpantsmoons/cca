export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'accountant' | 'bookkeeper' | 'reviewer' | 'director'
          professional_credentials: string | null
          firm_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'accountant' | 'bookkeeper' | 'reviewer' | 'director'
          professional_credentials?: string | null
          firm_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'accountant' | 'bookkeeper' | 'reviewer' | 'director'
          professional_credentials?: string | null
          firm_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          abn: string | null
          acn: string | null
          entity_type: 'proprietary_limited' | 'public_company' | 'trust' | 'partnership' | 'sole_trader'
          industry_sector: string | null
          registered_address: string | null
          principal_place_of_business: string | null
          financial_year_end: string
          reporting_entity_status: boolean
          parent_company_id: string | null
          created_by: string
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          abn?: string | null
          acn?: string | null
          entity_type: 'proprietary_limited' | 'public_company' | 'trust' | 'partnership' | 'sole_trader'
          industry_sector?: string | null
          registered_address?: string | null
          principal_place_of_business?: string | null
          financial_year_end?: string
          reporting_entity_status?: boolean
          parent_company_id?: string | null
          created_by: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          abn?: string | null
          acn?: string | null
          entity_type?: 'proprietary_limited' | 'public_company' | 'trust' | 'partnership' | 'sole_trader'
          industry_sector?: string | null
          registered_address?: string | null
          principal_place_of_business?: string | null
          financial_year_end?: string
          reporting_entity_status?: boolean
          parent_company_id?: string | null
          created_by?: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      company_directors: {
        Row: {
          id: string
          company_id: string
          full_name: string
          position: 'chairman' | 'managing_director' | 'director' | 'secretary'
          appointment_date: string
          resignation_date: string | null
          is_active: boolean
          signature_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          position: 'chairman' | 'managing_director' | 'director' | 'secretary'
          appointment_date: string
          resignation_date?: string | null
          is_active?: boolean
          signature_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          position?: 'chairman' | 'managing_director' | 'director' | 'secretary'
          appointment_date?: string
          resignation_date?: string | null
          is_active?: boolean
          signature_image_url?: string | null
          created_at?: string
        }
      }
      company_access: {
        Row: {
          id: string
          company_id: string
          user_id: string
          access_level: 'owner' | 'editor' | 'reviewer' | 'viewer'
          granted_at: string
          granted_by: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          access_level: 'owner' | 'editor' | 'reviewer' | 'viewer'
          granted_at?: string
          granted_by: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          access_level?: 'owner' | 'editor' | 'reviewer' | 'viewer'
          granted_at?: string
          granted_by?: string
        }
      }
      financial_statements: {
        Row: {
          id: string
          company_id: string
          financial_year_end: string
          statement_data: Json
          verification_result: Json
          status: 'draft' | 'in_review' | 'approved' | 'finalized' | 'lodged'
          version: number
          is_current_version: boolean
          created_by: string
          reviewed_by: string | null
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          financial_year_end: string
          statement_data: Json
          verification_result: Json
          status?: 'draft' | 'in_review' | 'approved' | 'finalized' | 'lodged'
          version?: number
          is_current_version?: boolean
          created_by: string
          reviewed_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          financial_year_end?: string
          statement_data?: Json
          verification_result?: Json
          status?: 'draft' | 'in_review' | 'approved' | 'finalized' | 'lodged'
          version?: number
          is_current_version?: boolean
          created_by?: string
          reviewed_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accounting_policies: {
        Row: {
          id: string
          company_id: string
          financial_year_end: string
          policy_category: 'revenue_recognition' | 'inventory_valuation' | 'depreciation' | 'impairment' | 'provisions' | 'other'
          policy_title: string
          policy_description: string
          aasb_reference: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          financial_year_end: string
          policy_category: 'revenue_recognition' | 'inventory_valuation' | 'depreciation' | 'impairment' | 'provisions' | 'other'
          policy_title: string
          policy_description: string
          aasb_reference?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          financial_year_end?: string
          policy_category?: 'revenue_recognition' | 'inventory_valuation' | 'depreciation' | 'impairment' | 'provisions' | 'other'
          policy_title?: string
          policy_description?: string
          aasb_reference?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      note_templates: {
        Row: {
          id: string
          company_id: string | null
          note_number: number
          note_title: string
          note_category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'other'
          template_content: string
          applicable_aasb_standards: string[]
          is_required: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          note_number: number
          note_title: string
          note_category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'other'
          template_content: string
          applicable_aasb_standards: string[]
          is_required?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          note_number?: number
          note_title?: string
          note_category?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'other'
          template_content?: string
          applicable_aasb_standards?: string[]
          is_required?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      workflow_comments: {
        Row: {
          id: string
          financial_statement_id: string
          user_id: string
          section: string
          line_item: string | null
          comment_text: string
          is_resolved: boolean
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          financial_statement_id: string
          user_id: string
          section: string
          line_item?: string | null
          comment_text: string
          is_resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          financial_statement_id?: string
          user_id?: string
          section?: string
          line_item?: string | null
          comment_text?: string
          is_resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      data_imports: {
        Row: {
          id: string
          company_id: string
          import_source: string
          file_name: string
          file_size: number | null
          import_status: 'pending' | 'processing' | 'completed' | 'failed'
          records_imported: number
          error_message: string | null
          imported_data: Json | null
          created_by: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          import_source: string
          file_name: string
          file_size?: number | null
          import_status?: 'pending' | 'processing' | 'completed' | 'failed'
          records_imported?: number
          error_message?: string | null
          imported_data?: Json | null
          created_by: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          import_source?: string
          file_name?: string
          file_size?: number | null
          import_status?: 'pending' | 'processing' | 'completed' | 'failed'
          records_imported?: number
          error_message?: string | null
          imported_data?: Json | null
          created_by?: string
          created_at?: string
          completed_at?: string | null
        }
      }
      compliance_checks: {
        Row: {
          id: string
          financial_statement_id: string
          check_category: string
          aasb_standard: string
          check_description: string
          check_status: 'passed' | 'warning' | 'failed' | 'not_applicable'
          finding_details: string | null
          recommendation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          financial_statement_id: string
          check_category: string
          aasb_standard: string
          check_description: string
          check_status: 'passed' | 'warning' | 'failed' | 'not_applicable'
          finding_details?: string | null
          recommendation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          financial_statement_id?: string
          check_category?: string
          aasb_standard?: string
          check_description?: string
          check_status?: 'passed' | 'warning' | 'failed' | 'not_applicable'
          finding_details?: string | null
          recommendation?: string | null
          created_at?: string
        }
      }
      report_templates: {
        Row: {
          id: string
          company_id: string | null
          template_name: string
          template_type: 'financial_statement' | 'directors_report' | 'compilation_report' | 'custom'
          logo_url: string | null
          header_content: string | null
          footer_content: string | null
          color_scheme: Json | null
          font_settings: Json | null
          is_default: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          template_name: string
          template_type: 'financial_statement' | 'directors_report' | 'compilation_report' | 'custom'
          logo_url?: string | null
          header_content?: string | null
          footer_content?: string | null
          color_scheme?: Json | null
          font_settings?: Json | null
          is_default?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          template_name?: string
          template_type?: 'financial_statement' | 'directors_report' | 'compilation_report' | 'custom'
          logo_url?: string | null
          header_content?: string | null
          footer_content?: string | null
          color_scheme?: Json | null
          font_settings?: Json | null
          is_default?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
