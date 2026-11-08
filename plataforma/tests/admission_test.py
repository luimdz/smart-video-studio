"""Exercise the deployed admission SQL against SQLite, including concurrent requests."""
import concurrent.futures
import json
import pathlib
import re
import sqlite3
import tempfile
import unittest
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
SQL = re.search(r'`(.*)`', (ROOT / 'lib/admission.ts').read_text(), re.S).group(1)
SCHEMA = next((ROOT / 'drizzle').glob('0000_*.sql')).read_text()
LIMITS = dict(profiles=3, monthlyMinutes=120, maxEpisodes=10, maxDuration=180, concurrentJobs=3, monthlyBudgetCents=2500)

class AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = str(pathlib.Path(self.tmp.name) / 'test.sqlite')
        with self.db() as conn:
            conn.executescript(SCHEMA)
            for account in ('a', 'b'):
                conn.execute("INSERT INTO accounts VALUES (?,?,?,'basic','active',?,'now')", (account, account, 'internal', json.dumps(LIMITS)))
                conn.execute("INSERT INTO profiles VALUES (?,?,?,'education','adults','#336644','','es-LATAM','now')", ('p-'+account, account, account))

    def tearDown(self):
        self.tmp.cleanup()

    def db(self):
        conn = sqlite3.connect(self.path, timeout=10)
        conn.execute('PRAGMA foreign_keys=ON')
        return conn

    def production(self, id, account='a', episodes=10, duration=90, budget=1000):
        with self.db() as conn:
            conn.execute("INSERT INTO productions (id,account_id,profile_id,title,type,style,topic,episodes,duration,budget_cents,status,request_key,created_at,updated_at) VALUES (?,?,?,'Series','series','2d','Education',?,?,?,'draft',?,'now','now')", (id, account, 'p-'+account, episodes, duration, budget, 'key-'+id))

    def reserve(self, id, period='2026-11'):
        with self.db() as conn:
            return conn.execute(SQL, (str(uuid.uuid4()), period, 'now', id, period, period)).rowcount

    def limits(self, **changes):
        value = {**LIMITS, **changes}
        with self.db() as conn:
            conn.execute('UPDATE accounts SET limits=? WHERE id=?', (json.dumps(value), 'a'))

    def test_duplicate_does_not_reserve_twice(self):
        self.production('one')
        self.assertEqual(self.reserve('one'), 1)
        self.assertEqual(self.reserve('one'), 0)

    def test_budget_and_account_isolation(self):
        self.production('one', budget=1500)
        self.production('two', budget=1500)
        self.production('other', account='b', budget=1500)
        self.assertEqual(self.reserve('one'), 1)
        self.assertEqual(self.reserve('two'), 0)
        self.assertEqual(self.reserve('other'), 1)

    def test_monthly_minutes_limit(self):
        self.limits(monthlyMinutes=20)
        self.production('one'); self.production('two')
        self.assertEqual(self.reserve('one'), 1)
        self.assertEqual(self.reserve('two'), 0)

    def test_suspended_or_downgraded_account(self):
        self.production('one', episodes=25)
        self.assertEqual(self.reserve('one'), 0)
        self.production('two')
        with self.db() as conn:
            conn.execute("UPDATE accounts SET status='suspended' WHERE id='a'")
        self.assertEqual(self.reserve('two'), 0)

    def test_unlimited_still_enforces_budget(self):
        self.limits(monthlyMinutes=None, profiles=None, maxEpisodes=25, monthlyBudgetCents=500)
        self.production('one', budget=501)
        self.assertEqual(self.reserve('one'), 0)

    def test_concurrent_jobs_cannot_overbook(self):
        self.limits(concurrentJobs=1)
        for i in range(8): self.production(str(i), budget=100)
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(self.reserve, map(str, range(8))))
        self.assertEqual(sum(results), 1)

    def test_settled_previous_month_does_not_use_new_month_quota(self):
        self.production('one', budget=1500); self.assertEqual(self.reserve('one'), 1)
        with self.db() as conn: conn.execute("UPDATE reservations SET status='settled'")
        self.production('two', budget=1500)
        self.assertEqual(self.reserve('two', period='2026-12'), 1)

if __name__ == '__main__': unittest.main()
