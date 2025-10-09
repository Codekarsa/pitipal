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
        url:=current_setting('app.settings.supabase_url') || '/functions/v1/monthly-rollover',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
        ),
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);