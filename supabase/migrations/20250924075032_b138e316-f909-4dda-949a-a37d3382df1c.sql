-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the monthly rollover function to run on the 1st of each month at 2 AM UTC
SELECT cron.schedule(
  'monthly-budget-rollover',
  '0 2 1 * *', -- At 2:00 AM on the 1st day of every month
  $$
  SELECT
    net.http_post(
        url:='https://nhqlaikoiyqmwsxqjorn.supabase.co/functions/v1/monthly-rollover',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocWxhaWtvaXlxbXdzeHFqb3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTA3NDUsImV4cCI6MjA3NDA4Njc0NX0.8cr36_MnLrwjGh22-Vu1TQtLbIJfBb0KL9i6DYgKeEg"}'::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);