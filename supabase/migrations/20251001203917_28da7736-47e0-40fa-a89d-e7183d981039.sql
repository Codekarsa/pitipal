-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule monthly rollover to run on the 1st of every month at 1:00 AM
SELECT cron.schedule(
  'monthly-pocket-rollover',
  '0 1 1 * *', -- At 01:00 on day-of-month 1
  $$
  SELECT
    net.http_post(
        url:='https://nhqlaikoiyqmwsxqjorn.supabase.co/functions/v1/monthly-rollover',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocWxhaWtvaXlxbXdzeHFqb3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTA3NDUsImV4cCI6MjA3NDA4Njc0NX0.8cr36_MnLrwjGh22-Vu1TQtLbIJfBb0KL9i6DYgKeEg"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);