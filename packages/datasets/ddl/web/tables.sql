CREATE TABLE campaigns (
  campaign_id bigint PRIMARY KEY,
  campaign_name text NOT NULL,
  channel text NOT NULL CHECK (
    channel IN ('paid_search', 'paid_social', 'display', 'email', 'affiliate', 'video')
  ),
  utm_source text NOT NULL,
  utm_medium text NOT NULL,
  utm_campaign text NOT NULL,
  budget_amount numeric(14, 2) NOT NULL,
  currency char(3) NOT NULL,
  starts_on date NOT NULL,
  ends_on date
);

CREATE TABLE sessions (
  session_id bigint PRIMARY KEY,
  visitor_id text NOT NULL,
  customer_id bigint,
  campaign_id bigint,
  traffic_source text NOT NULL CHECK (
    traffic_source IN ('direct', 'organic_search', 'referral', 'campaign')
  ),
  referrer_domain text,
  landing_path text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser text NOT NULL,
  operating_system text NOT NULL,
  user_agent_family text NOT NULL,
  country_code char(2) NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  page_view_count integer NOT NULL,
  CHECK (ended_at >= started_at)
);

CREATE TABLE page_views (
  page_view_id bigint PRIMARY KEY,
  session_id bigint NOT NULL,
  page_path text NOT NULL,
  page_type text NOT NULL,
  referrer_path text,
  viewed_at timestamptz NOT NULL,
  time_on_page_ms integer
);

CREATE TABLE events (
  event_id bigint PRIMARY KEY,
  session_id bigint NOT NULL,
  visitor_id text NOT NULL,
  event_name text NOT NULL,
  page_path text,
  event_at timestamptz NOT NULL,
  properties jsonb NOT NULL
);

CREATE TABLE experiments (
  experiment_id bigint PRIMARY KEY,
  experiment_key text NOT NULL,
  experiment_name text NOT NULL,
  hypothesis text NOT NULL,
  primary_metric text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'stopped')),
  traffic_allocation numeric(4, 3) NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);

CREATE TABLE experiment_assignments (
  assignment_id bigint PRIMARY KEY,
  experiment_id bigint NOT NULL,
  visitor_id text NOT NULL,
  variant text NOT NULL CHECK (variant IN ('control', 'treatment')),
  assigned_at timestamptz NOT NULL
);
