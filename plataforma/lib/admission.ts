export const RESERVATION_SQL = `INSERT OR IGNORE INTO reservations (id,production_id,account_id,period,seconds,cents,status,created_at)
        SELECT ?,p.id,p.account_id,?,p.episodes*p.duration,p.budget_cents,'active',? FROM productions p JOIN accounts a ON a.id=p.account_id
        WHERE p.id=? AND p.status='draft' AND a.status='active'
        AND p.episodes<=json_extract(a.limits,'$.maxEpisodes') AND p.duration<=json_extract(a.limits,'$.maxDuration')
        AND p.budget_cents+coalesce((SELECT sum(cents) FROM reservations r WHERE r.account_id=a.id AND r.period=? AND r.status IN ('active','settled')),0)<=json_extract(a.limits,'$.monthlyBudgetCents')
        AND (json_extract(a.limits,'$.monthlyMinutes') IS NULL OR p.episodes*p.duration+coalesce((SELECT sum(seconds) FROM reservations r WHERE r.account_id=a.id AND r.period=? AND r.status IN ('active','settled')),0)<=json_extract(a.limits,'$.monthlyMinutes')*60)
        AND (SELECT count(*) FROM reservations r WHERE r.account_id=a.id AND r.status='active')<json_extract(a.limits,'$.concurrentJobs')`;
