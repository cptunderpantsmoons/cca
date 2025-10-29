/*
  # Core Database Schema for AASB Financial Statement System

  1. New Tables
    - `profiles` - User profiles with professional details
    - `companies` - Company information including ABN, ACN, entity type
    - `company_directors` - Director details for each company
    - `company_access` - Access control for users to companies
    - `financial_statements` - Historical financial statement storage
    - `accounting_policies` - Company-specific accounting policies
    - `note_templates` - Note templates for consistency

  2. Security
    - Enable RLS on all tables
    - Add restrictive policies ensuring users only access their data
    
  3. Important Notes
    - All tables use uuid primary keys
    - Includes audit trails with created_at and updated_at
    - Foreign key relationships enforce data integrity
    - Indexes added for query performance
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'accountant' CHECK (role IN ('admin', 'accountant', 'bookkeeper', 'reviewer', 'director')),
  professional_credentials text,
  firm_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abn text,
  acn text,
  entity_type text NOT NULL CHECK (entity_type IN ('proprietary_limited', 'public_company', 'trust', 'partnership', 'sole_trader')),
  industry_sector text,
  registered_address text,
  principal_place_of_business text,
  financial_year_end text NOT NULL DEFAULT '06-30',
  reporting_entity_status boolean DEFAULT false,
  parent_company_id uuid REFERENCES companies(id),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create company_access table (needed before RLS policies reference it)
CREATE TABLE IF NOT EXISTS company_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  access_level text NOT NULL CHECK (access_level IN ('owner', 'editor', 'reviewer', 'viewer')),
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES profiles(id) NOT NULL,
  UNIQUE(company_id, user_id)
);

-- Create company_directors table
CREATE TABLE IF NOT EXISTS company_directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  position text NOT NULL CHECK (position IN ('chairman', 'managing_director', 'director', 'secretary')),
  appointment_date date NOT NULL,
  resignation_date date,
  is_active boolean DEFAULT true,
  signature_image_url text,
  created_at timestamptz DEFAULT now()
);

-- Create financial_statements table
CREATE TABLE IF NOT EXISTS financial_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  financial_year_end date NOT NULL,
  statement_data jsonb NOT NULL,
  verification_result jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'finalized', 'lodged')),
  version integer NOT NULL DEFAULT 1,
  is_current_version boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  reviewed_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create accounting_policies table
CREATE TABLE IF NOT EXISTS accounting_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  financial_year_end date NOT NULL,
  policy_category text NOT NULL CHECK (policy_category IN ('revenue_recognition', 'inventory_valuation', 'depreciation', 'impairment', 'provisions', 'other')),
  policy_title text NOT NULL,
  policy_description text NOT NULL,
  aasb_reference text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create note_templates table
CREATE TABLE IF NOT EXISTS note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  note_number integer NOT NULL,
  note_title text NOT NULL,
  note_category text NOT NULL CHECK (note_category IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'other')),
  template_content text NOT NULL,
  applicable_aasb_standards text[],
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for companies
CREATE POLICY "Users can view companies they have access to"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = companies.id
      AND company_access.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Company owners can update their companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = companies.id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor')
    )
    OR created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = companies.id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor')
    )
    OR created_by = auth.uid()
  );

-- RLS Policies for company_access
CREATE POLICY "Users can view access records for their companies"
  ON company_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM company_access ca
      WHERE ca.company_id = company_access.company_id
      AND ca.user_id = auth.uid()
      AND ca.access_level = 'owner'
    )
  );

CREATE POLICY "Company owners can grant access"
  ON company_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_access.company_id
      AND companies.created_by = auth.uid()
    )
    AND auth.uid() = granted_by
  );

CREATE POLICY "Company owners can revoke access"
  ON company_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_access.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- RLS Policies for company_directors
CREATE POLICY "Users can view directors of accessible companies"
  ON company_directors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = company_directors.company_id
      AND company_access.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_directors.company_id
      AND companies.created_by = auth.uid()
    )
  );

CREATE POLICY "Company editors can manage directors"
  ON company_directors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = company_directors.company_id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_directors.company_id
      AND companies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = company_directors.company_id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_directors.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- RLS Policies for financial_statements
CREATE POLICY "Users can view financial statements of accessible companies"
  ON financial_statements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = financial_statements.company_id
      AND company_access.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = financial_statements.company_id
      AND companies.created_by = auth.uid()
    )
  );

CREATE POLICY "Editors can create financial statements"
  ON financial_statements FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM company_access
        WHERE company_access.company_id = financial_statements.company_id
        AND company_access.user_id = auth.uid()
        AND company_access.access_level IN ('owner', 'editor')
      )
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = financial_statements.company_id
        AND companies.created_by = auth.uid()
      )
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Editors and reviewers can update financial statements"
  ON financial_statements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = financial_statements.company_id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor', 'reviewer')
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = financial_statements.company_id
      AND companies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = financial_statements.company_id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor', 'reviewer')
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = financial_statements.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- RLS Policies for accounting_policies
CREATE POLICY "Users can view accounting policies of accessible companies"
  ON accounting_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = accounting_policies.company_id
      AND company_access.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = accounting_policies.company_id
      AND companies.created_by = auth.uid()
    )
  );

CREATE POLICY "Editors can manage accounting policies"
  ON accounting_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = accounting_policies.company_id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = accounting_policies.company_id
      AND companies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = accounting_policies.company_id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = accounting_policies.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- RLS Policies for note_templates
CREATE POLICY "Users can view note templates for accessible companies"
  ON note_templates FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = note_templates.company_id
      AND company_access.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = note_templates.company_id
      AND companies.created_by = auth.uid()
    )
  );

CREATE POLICY "Editors can manage company note templates"
  ON note_templates FOR ALL
  TO authenticated
  USING (
    company_id IS NOT NULL AND
    (
      EXISTS (
        SELECT 1 FROM company_access
        WHERE company_access.company_id = note_templates.company_id
        AND company_access.user_id = auth.uid()
        AND company_access.access_level IN ('owner', 'editor')
      )
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = note_templates.company_id
        AND companies.created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    company_id IS NOT NULL AND
    (
      EXISTS (
        SELECT 1 FROM company_access
        WHERE company_access.company_id = note_templates.company_id
        AND company_access.user_id = auth.uid()
        AND company_access.access_level IN ('owner', 'editor')
      )
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = note_templates.company_id
        AND companies.created_by = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
CREATE INDEX IF NOT EXISTS idx_companies_archived ON companies(is_archived);
CREATE INDEX IF NOT EXISTS idx_company_directors_company_id ON company_directors(company_id);
CREATE INDEX IF NOT EXISTS idx_company_directors_active ON company_directors(is_active);
CREATE INDEX IF NOT EXISTS idx_company_access_company_id ON company_access(company_id);
CREATE INDEX IF NOT EXISTS idx_company_access_user_id ON company_access(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_statements_company_id ON financial_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_statements_status ON financial_statements(status);
CREATE INDEX IF NOT EXISTS idx_financial_statements_year ON financial_statements(financial_year_end);
CREATE INDEX IF NOT EXISTS idx_accounting_policies_company_id ON accounting_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_note_templates_company_id ON note_templates(company_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
        CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_financial_statements_updated_at') THEN
        CREATE TRIGGER update_financial_statements_updated_at BEFORE UPDATE ON financial_statements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_accounting_policies_updated_at') THEN
        CREATE TRIGGER update_accounting_policies_updated_at BEFORE UPDATE ON accounting_policies
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_note_templates_updated_at') THEN
        CREATE TRIGGER update_note_templates_updated_at BEFORE UPDATE ON note_templates
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
