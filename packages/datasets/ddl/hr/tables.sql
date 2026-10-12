CREATE TABLE locations (
  location_id bigint PRIMARY KEY,
  office_name text NOT NULL,
  city text NOT NULL,
  country_code char(2) NOT NULL,
  region text NOT NULL CHECK (region IN ('EMEA', 'AMER', 'APAC')),
  is_remote_hub boolean NOT NULL,
  opened_on date NOT NULL
);

CREATE TABLE departments (
  department_id bigint PRIMARY KEY,
  department_name text NOT NULL,
  parent_department_id bigint,
  cost_center_code text NOT NULL,
  head_employee_id bigint
);

CREATE TABLE employees (
  employee_id bigint PRIMARY KEY,
  employee_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  work_email text NOT NULL,
  date_of_birth date NOT NULL,
  hire_date date NOT NULL,
  termination_date date,
  termination_reason text CHECK (
    termination_reason IN ('resignation', 'dismissal', 'redundancy', 'retirement', 'contract_end')
  ),
  department_id bigint NOT NULL,
  location_id bigint NOT NULL,
  manager_id bigint,
  job_title text NOT NULL,
  job_level text NOT NULL,
  employment_type text NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
  status text NOT NULL CHECK (status IN ('active', 'on_leave', 'terminated'))
);

CREATE TABLE employment_history (
  history_id bigint PRIMARY KEY,
  employee_id bigint NOT NULL,
  department_id bigint NOT NULL,
  job_title text NOT NULL,
  job_level text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  change_reason text NOT NULL CHECK (
    change_reason IN ('hire', 'promotion', 'transfer', 'reorganisation', 'title_change')
  )
);

CREATE TABLE salaries (
  salary_id bigint PRIMARY KEY,
  employee_id bigint NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  base_salary numeric(14, 2) NOT NULL CHECK (base_salary > 0),
  currency char(3) NOT NULL,
  bonus_target_pct numeric(5, 2) NOT NULL,
  change_reason text NOT NULL CHECK (
    change_reason IN ('hire', 'annual_review', 'promotion', 'market_adjustment')
  )
);

CREATE TABLE performance_reviews (
  review_id bigint PRIMARY KEY,
  employee_id bigint NOT NULL,
  reviewer_id bigint,
  review_period text NOT NULL,
  period_end date NOT NULL,
  self_rating smallint CHECK (self_rating BETWEEN 1 AND 5),
  manager_rating smallint NOT NULL CHECK (manager_rating BETWEEN 1 AND 5),
  calibrated_rating smallint CHECK (calibrated_rating BETWEEN 1 AND 5),
  submitted_at timestamptz NOT NULL
);

CREATE TABLE leave_requests (
  leave_request_id bigint PRIMARY KEY,
  employee_id bigint NOT NULL,
  leave_type text NOT NULL CHECK (
    leave_type IN ('annual', 'sick', 'parental', 'unpaid', 'bereavement', 'study')
  ),
  start_date date NOT NULL,
  end_date date NOT NULL,
  working_days numeric(4, 1) NOT NULL CHECK (working_days > 0),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz NOT NULL,
  decided_by bigint,
  decided_at timestamptz,
  CHECK (end_date >= start_date)
);
