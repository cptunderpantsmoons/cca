/*
  # Additional Tables for Enhanced Functionality

  1. New Tables
    - `audit_logs` - Track all important actions for compliance
    - `workflow_comments` - Comments and annotations on financial statements
    - `data_imports` - Track imported data from accounting software
    - `compliance_checks` - Store AASB compliance check results
    - `report_templates` - Custom report templates with branding

  2. Security
    - Enable RLS on all new tables
    - Restrictive policies based on company access
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs of accessible companies"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = audit_logs.company_id
      AND company_access.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = audit_logs.company_id
      AND companies.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create workflow_comments table
CREATE TABLE IF NOT EXISTS workflow_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_statement_id uuid REFERENCES financial_statements(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  section text NOT NULL,
  line_item text,
  comment_text text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workflow_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible statements"
  ON workflow_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN company_access ca ON ca.company_id = fs.company_id
      WHERE fs.id = workflow_comments.financial_statement_id
      AND ca.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN companies c ON c.id = fs.company_id
      WHERE fs.id = workflow_comments.financial_statement_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can add comments on accessible statements"
  ON workflow_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN company_access ca ON ca.company_id = fs.company_id
      WHERE fs.id = workflow_comments.financial_statement_id
      AND ca.user_id = auth.uid()
      AND ca.access_level IN ('owner', 'editor', 'reviewer')
    )
    OR EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN companies c ON c.id = fs.company_id
      WHERE fs.id = workflow_comments.financial_statement_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON workflow_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create data_imports table
CREATE TABLE IF NOT EXISTS data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  import_source text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  import_status text NOT NULL DEFAULT 'pending' CHECK (import_status IN ('pending', 'processing', 'completed', 'failed')),
  records_imported integer DEFAULT 0,
  error_message text,
  imported_data jsonb,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view imports of accessible companies"
  ON data_imports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = data_imports.company_id
      AND company_access.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = data_imports.company_id
      AND companies.created_by = auth.uid()
    )
  );

CREATE POLICY "Editors can create imports"
  ON data_imports FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM company_access
        WHERE company_access.company_id = data_imports.company_id
        AND company_access.user_id = auth.uid()
        AND company_access.access_level IN ('owner', 'editor')
      )
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = data_imports.company_id
        AND companies.created_by = auth.uid()
      )
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Editors can update imports"
  ON data_imports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = data_imports.company_id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = data_imports.company_id
      AND companies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = data_imports.company_id
      AND company_access.user_id = auth.uid()
      AND company_access.access_level IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = data_imports.company_id
      AND companies.created_by = auth.uid()
    )
  );

-- Create compliance_checks table
CREATE TABLE IF NOT EXISTS compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_statement_id uuid REFERENCES financial_statements(id) ON DELETE CASCADE NOT NULL,
  check_category text NOT NULL,
  aasb_standard text NOT NULL,
  check_description text NOT NULL,
  check_status text NOT NULL CHECK (check_status IN ('passed', 'warning', 'failed', 'not_applicable')),
  finding_details text,
  recommendation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance checks on accessible statements"
  ON compliance_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN company_access ca ON ca.company_id = fs.company_id
      WHERE fs.id = compliance_checks.financial_statement_id
      AND ca.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN companies c ON c.id = fs.company_id
      WHERE fs.id = compliance_checks.financial_statement_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "System can manage compliance checks"
  ON compliance_checks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN company_access ca ON ca.company_id = fs.company_id
      WHERE fs.id = compliance_checks.financial_statement_id
      AND ca.user_id = auth.uid()
      AND ca.access_level IN ('owner', 'editor', 'reviewer')
    )
    OR EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN companies c ON c.id = fs.company_id
      WHERE fs.id = compliance_checks.financial_statement_id
      AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN company_access ca ON ca.company_id = fs.company_id
      WHERE fs.id = compliance_checks.financial_statement_id
      AND ca.user_id = auth.uid()
      AND ca.access_level IN ('owner', 'editor', 'reviewer')
    )
    OR EXISTS (
      SELECT 1 FROM financial_statements fs
      JOIN companies c ON c.id = fs.company_id
      WHERE fs.id = compliance_checks.financial_statement_id
      AND c.created_by = auth.uid()
    )
  );

-- Create report_templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('financial_statement', 'directors_report', 'compilation_report', 'custom')),
  logo_url text,
  header_content text,
  footer_content text,
  color_scheme jsonb,
  font_settings jsonb,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates for accessible companies"
  ON report_templates FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM company_access
      WHERE company_access.company_id = report_templates.company_id
      AND company_access.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = report_templates.company_id
      AND companies.created_by = auth.uid()
    )
  );

CREATE POLICY "Editors can manage templates"
  ON report_templates FOR ALL
  TO authenticated
  USING (
    company_id IS NOT NULL AND
    (
      EXISTS (
        SELECT 1 FROM company_access
        WHERE company_access.company_id = report_templates.company_id
        AND company_access.user_id = auth.uid()
        AND company_access.access_level IN ('owner', 'editor')
      )
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = report_templates.company_id
        AND companies.created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    company_id IS NOT NULL AND
    (
      EXISTS (
        SELECT 1 FROM company_access
        WHERE company_access.company_id = report_templates.company_id
        AND company_access.user_id = auth.uid()
        AND company_access.access_level IN ('owner', 'editor')
      )
      OR EXISTS (
        SELECT 1 FROM companies
        WHERE companies.id = report_templates.company_id
        AND companies.created_by = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_statement_id ON workflow_comments(financial_statement_id);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_resolved ON workflow_comments(is_resolved);
CREATE INDEX IF NOT EXISTS idx_data_imports_company_id ON data_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_data_imports_status ON data_imports(import_status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_statement_id ON compliance_checks(financial_statement_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(check_status);
CREATE INDEX IF NOT EXISTS idx_report_templates_company_id ON report_templates(company_id);

-- Add triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workflow_comments_updated_at') THEN
        CREATE TRIGGER update_workflow_comments_updated_at BEFORE UPDATE ON workflow_comments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_templates_updated_at') THEN
        CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
