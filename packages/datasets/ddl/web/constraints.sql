ALTER TABLE campaigns ADD CONSTRAINT campaigns_utm_campaign_key UNIQUE (utm_campaign);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id);
CREATE INDEX sessions_visitor_id_idx ON sessions (visitor_id);
CREATE INDEX sessions_started_at_idx ON sessions (started_at);
CREATE INDEX sessions_campaign_id_idx ON sessions (campaign_id);

ALTER TABLE page_views
  ADD CONSTRAINT page_views_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions (session_id);
CREATE INDEX page_views_session_id_idx ON page_views (session_id);
CREATE INDEX page_views_viewed_at_idx ON page_views (viewed_at);

CREATE INDEX events_session_id_idx ON events (session_id);
CREATE INDEX events_event_name_event_at_idx ON events (event_name, event_at);
CREATE INDEX events_visitor_id_idx ON events (visitor_id);

ALTER TABLE experiments ADD CONSTRAINT experiments_experiment_key_key UNIQUE (experiment_key);

ALTER TABLE experiment_assignments
  ADD CONSTRAINT experiment_assignments_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES experiments (experiment_id);
ALTER TABLE experiment_assignments
  ADD CONSTRAINT experiment_assignments_experiment_visitor_key UNIQUE (experiment_id, visitor_id);
CREATE INDEX experiment_assignments_visitor_id_idx ON experiment_assignments (visitor_id);
