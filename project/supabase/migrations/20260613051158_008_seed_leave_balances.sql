-- Auto-create leave balances for all existing employees who don't have them for current year
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days)
SELECT
  e.id,
  lt.id,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  lt.days_allowed,
  0
FROM employees e
CROSS JOIN leave_types lt
WHERE e.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM leave_balances lb
  WHERE lb.employee_id = e.id
  AND lb.leave_type_id = lt.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
);