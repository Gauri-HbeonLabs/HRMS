CREATE TABLE company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key varchar UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_company_settings" ON company_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_company_settings" ON company_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo')));

CREATE POLICY "update_company_settings" ON company_settings FOR UPDATE
  TO authenticated USING (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo'))) WITH CHECK (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo')));

CREATE POLICY "delete_company_settings" ON company_settings FOR DELETE
  TO authenticated USING (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo')));
