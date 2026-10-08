ALTER TABLE departments
  ADD CONSTRAINT departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES departments (department_id);
ALTER TABLE departments
  ADD CONSTRAINT departments_head_employee_id_fkey FOREIGN KEY (head_employee_id) REFERENCES employees (employee_id);

ALTER TABLE employees ADD CONSTRAINT employees_employee_number_key UNIQUE (employee_number);
ALTER TABLE employees
  ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments (department_id);
ALTER TABLE employees
  ADD CONSTRAINT employees_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (location_id);
ALTER TABLE employees
  ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES employees (employee_id);
CREATE INDEX employees_department_id_idx ON employees (department_id);
CREATE INDEX employees_manager_id_idx ON employees (manager_id);

ALTER TABLE employment_history
  ADD CONSTRAINT employment_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (employee_id);
ALTER TABLE employment_history
  ADD CONSTRAINT employment_history_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments (department_id);
CREATE INDEX employment_history_employee_id_idx ON employment_history (employee_id, start_date);

ALTER TABLE salaries
  ADD CONSTRAINT salaries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (employee_id);
CREATE INDEX salaries_employee_id_idx ON salaries (employee_id, effective_from);

ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (employee_id);
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES employees (employee_id);
ALTER TABLE performance_reviews
  ADD CONSTRAINT performance_reviews_employee_period_key UNIQUE (employee_id, review_period);

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (employee_id);
ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES employees (employee_id);
CREATE INDEX leave_requests_employee_id_idx ON leave_requests (employee_id, start_date);
