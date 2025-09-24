-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the monthly rollover function to run on the 1st of each month at 2 AM UTC
SELECT cron.schedule(
  'monthly-budget-rollover',
  '0 2 1 * *', -- At 2:00 AM on the 1st day of every month
  $$
  SELECT
    net.http_post(
        url:='***REMOVED***/functions/v1/monthly-rollover',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ***REMOVED***"}'::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);