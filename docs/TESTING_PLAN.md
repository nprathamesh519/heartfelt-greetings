# 🧪 Universal Biometric Attendance System — Complete Testing Plan

> Enterprise-grade testing strategy covering unit, integration, security, load, and production readiness.

---

## 1️⃣ UNIT TESTING

### Automated Tests Created (Vitest)
- **`src/test/adapters.test.ts`** — Tests all adapter conversion logic (ZKTeco, Hikvision, Suprema, Generic)
- **`src/test/protected-route.test.tsx`** — Tests role-based route protection

### What's Covered

| Test Area | File | Cases |
|-----------|------|-------|
| ZKTeco adapter | adapters.test.ts | Standard fields, alternate field names, fallback fields |
| Hikvision adapter | adapters.test.ts | employeeNo/deviceName, ipAddress fallback |
| Suprema adapter | adapters.test.ts | event_type threshold (≤20 = check-in) |
| Generic adapter | adapters.test.ts | userId/biometric_id fallback, empty arrays, default type |
| Adapter selection | adapters.test.ts | Known companies, unknown fallback to generic |
| Timestamp validation | adapters.test.ts | 5-min window, expired, future timestamps |
| Duplicate prevention | adapters.test.ts | Upsert conflict on student_id+attendance_date |
| Route protection | protected-route.test.tsx | Loading state, unauthenticated redirect, role matching, cross-role redirect |

### Run Tests
```bash
npx vitest run
```

---

## 2️⃣ INTEGRATION TESTING

### Complete Webhook Flow Test (Manual via cURL/Postman)

```bash
# Step 1: Register a device in the admin dashboard
# Step 2: Note the device_serial and secret_key

# Step 3: Send webhook data
curl -X POST https://uyoksdrpwlukwnklhwru.supabase.co/functions/v1/device-webhook \
  -H "Content-Type: application/json" \
  -H "x-device-id: YOUR_DEVICE_SERIAL" \
  -H "x-device-secret: YOUR_SECRET_KEY" \
  -H "x-nonce: test-nonce-$(date +%s)" \
  -H "x-timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{
    "logs": [
      {"pin": "BIO001", "sn": "YOUR_DEVICE_SERIAL", "timestamp": "2026-02-12T08:30:00Z", "status": 0},
      {"pin": "BIO002", "sn": "YOUR_DEVICE_SERIAL", "timestamp": "2026-02-12T08:35:00Z", "status": 0}
    ]
  }'

# Expected: {"success":true,"records_synced":2}

# Step 4: Verify in admin dashboard → Attendance page
# Step 5: Verify in sync logs page
```

### Edge Cases to Test

| Scenario | Input | Expected |
|----------|-------|----------|
| Empty logs array | `{"logs": []}` | `records_synced: 0` |
| Single log (no array wrapper) | `{"pin":"1","sn":"X","timestamp":"...","status":0}` | Processes as single |
| Student not found | biometric_id not in DB | Error logged, skipped |
| Invalid timestamp | `"timestamp": "not-a-date"` | Error in processing |
| Mixed valid/invalid | Some valid, some invalid | Partial success with errors |

---

## 3️⃣ ROLE-BASED ACCESS TESTING

### Route Protection Matrix

| Route | Admin | Teacher | Unauthenticated |
|-------|-------|---------|-----------------|
| `/admin` | ✅ Access | ❌ → `/teacher` | ❌ → `/auth` |
| `/admin/devices` | ✅ Access | ❌ → `/teacher` | ❌ → `/auth` |
| `/admin/teachers` | ✅ Access | ❌ → `/teacher` | ❌ → `/auth` |
| `/admin/classes` | ✅ Access | ❌ → `/teacher` | ❌ → `/auth` |
| `/admin/students` | ✅ Access | ❌ → `/teacher` | ❌ → `/auth` |
| `/admin/attendance` | ✅ Access | ❌ → `/teacher` | ❌ → `/auth` |
| `/admin/sync-logs` | ✅ Access | ❌ → `/teacher` | ❌ → `/auth` |
| `/admin/audit-logs` | ✅ Access | ❌ → `/teacher` | ❌ → `/auth` |
| `/teacher` | ❌ → `/admin` | ✅ Access | ❌ → `/auth` |
| `/teacher/attendance` | ❌ → `/admin` | ✅ Access | ❌ → `/auth` |

### RLS Policy Verification (SQL)

```sql
-- Test: Teacher can only see their assigned classes' students
SET ROLE authenticated;
-- As teacher user, try to query students from unassigned class
SELECT * FROM students WHERE class_id = 'UNASSIGNED_CLASS_ID';
-- Expected: Empty result (RLS blocks)

-- Test: Admin can see all data
-- As admin user, query all students
SELECT * FROM students;
-- Expected: All students returned
```

---

## 4️⃣ WEBHOOK SECURITY TESTING

### Postman/cURL Test Scenarios

| # | Test | Command | Expected |
|---|------|---------|----------|
| 1 | Missing credentials | No `x-device-id` header | `401: Missing device credentials` |
| 2 | Invalid secret | Wrong `x-device-secret` | `401: Invalid device secret` + audit log |
| 3 | Disabled device | Device with `is_enabled=false` | `401: Device not found or disabled` |
| 4 | Replay attack | Reuse same `x-nonce` | `409: Duplicate request (replay)` |
| 5 | Expired timestamp | `x-timestamp` >5 min old | `401: Request expired` |
| 6 | SQL injection | `x-device-id: "'; DROP TABLE devices;--"` | `401: Device not found` (parameterized query) |
| 7 | Large payload | 10,000 log entries | Should process or timeout gracefully |
| 8 | Invalid JSON | Malformed body | `500: Internal server error` |
| 9 | Wrong method | GET request | `405: Method not allowed` |

```bash
# Test 1: Missing credentials
curl -X POST https://uyoksdrpwlukwnklhwru.supabase.co/functions/v1/device-webhook \
  -H "Content-Type: application/json" \
  -d '{"logs":[]}'
# Expected: 401

# Test 4: Replay attack (send twice with same nonce)
NONCE="replay-test-123"
curl -X POST ... -H "x-nonce: $NONCE" -d '...'  # First: 200
curl -X POST ... -H "x-nonce: $NONCE" -d '...'  # Second: 409

# Test 6: SQL injection attempt
curl -X POST ... -H "x-device-id: '; DROP TABLE devices;--" -d '{}'
# Expected: 401 (Supabase uses parameterized queries, safe)
```

---

## 5️⃣ SCHEDULER (AUTO-SYNC) TESTING

### Test Scenarios

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| 1 | Successful pull | Device API reachable, returns logs | `sync_log.status = "success"` |
| 2 | Device offline | Device API unreachable | 3 retries, then `status = "failed"`, `is_online = false` |
| 3 | Timeout | Device takes >10s | AbortController triggers, retry |
| 4 | Duplicate prevention | Same attendance data sent twice | Upsert updates, no duplicates |
| 5 | No API pull devices | All devices are webhook type | `"No API pull devices found"` |
| 6 | Partial success | 3 devices, 1 fails | Mixed results array |

### Retry Logic Verification

The auto-sync function retries 3 times with 2-second delays:
```
Attempt 1 → Fail → Wait 2s
Attempt 2 → Fail → Wait 2s
Attempt 3 → Fail → Mark as failed
```

### Verify via Sync Logs Page
1. Trigger auto-sync edge function manually
2. Check `/admin/sync-logs` for new entries
3. Verify `sync_type = "auto"`, correct `status`, `records_synced`, `error_message`

---

## 6️⃣ DATABASE CONSTRAINT TESTING

### SQL Test Queries

```sql
-- Test 1: Duplicate attendance (unique constraint)
INSERT INTO attendance (student_id, attendance_date, status)
VALUES ('STUDENT_UUID', '2026-02-12', 'present');
-- Insert same again:
INSERT INTO attendance (student_id, attendance_date, status)
VALUES ('STUDENT_UUID', '2026-02-12', 'present');
-- Expected: Unique constraint violation on (student_id, attendance_date)

-- Test 2: Foreign key - invalid device_id
INSERT INTO attendance (student_id, device_id, attendance_date, status)
VALUES ('VALID_STUDENT', 'NONEXISTENT_DEVICE', '2026-02-12', 'present');
-- Expected: Foreign key violation (attendance_device_id_fkey)

-- Test 3: Foreign key - invalid student_id
INSERT INTO attendance (student_id, attendance_date, status)
VALUES ('NONEXISTENT_STUDENT', '2026-02-12', 'present');
-- Expected: Foreign key violation (attendance_student_id_fkey)

-- Test 4: Soft delete (is_deleted flag)
UPDATE attendance SET is_deleted = true WHERE id = 'SOME_ID';
SELECT * FROM attendance WHERE id = 'SOME_ID';
-- Expected: Row exists with is_deleted = true, filtered in app queries

-- Test 5: Webhook nonce uniqueness
INSERT INTO webhook_nonces (nonce, device_id) VALUES ('nonce-1', 'DEVICE_UUID');
INSERT INTO webhook_nonces (nonce, device_id) VALUES ('nonce-1', 'DEVICE_UUID');
-- Expected: Constraint violation (prevents replay)

-- Test 6: Student class foreign key
INSERT INTO students (full_name, student_id, class_id)
VALUES ('Test Student', 'STU-999', 'NONEXISTENT_CLASS');
-- Expected: Foreign key violation (students_class_id_fkey)
```

---

## 7️⃣ FRONTEND FUNCTIONAL TESTING

### Admin Dashboard Checklist

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | Dashboard loads | Login as admin → `/admin` | Stats cards show, charts render |
| 2 | Add device | Devices → Add → Fill form → Submit | Device appears in list |
| 3 | Edit device | Click edit on device → Modify → Save | Changes persisted |
| 4 | Disable device | Toggle device enabled/disabled | Status updates |
| 5 | View attendance | Attendance page → Select date | Records displayed |
| 6 | Correct attendance | Click edit on record → Modify → Save | Correction logged with reason |
| 7 | View sync logs | Sync Logs page | All sync history shown |
| 8 | View audit logs | Audit Logs page | All actions logged |
| 9 | Manage teachers | Teachers page → Add/Edit/Remove | CRUD operations work |
| 10 | Manage classes | Classes page → Add/Edit | Class list updates |
| 11 | Manage students | Students page → Add/Edit/Assign | Student records update |

### Teacher Dashboard Checklist

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1 | Dashboard loads | Login as teacher → `/teacher` | Assigned classes shown |
| 2 | View attendance | Select class → Select date | Only assigned class students |
| 3 | Filter by date | Change date picker | Attendance updates |
| 4 | Cannot access admin | Navigate to `/admin` | Redirected to `/teacher` |
| 5 | Cannot see devices | No device menu in sidebar | Device management hidden |

### Cross-Browser Testing

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ Test | ✅ Test |
| Firefox | ✅ Test | ✅ Test |
| Safari | ✅ Test | ✅ Test |
| Edge | ✅ Test | — |

---

## 8️⃣ LOAD & STRESS TESTING

### k6 Test Script

```javascript
// load-test.js — Run with: k6 run load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    webhook_load: {
      executor: 'constant-arrival-rate',
      rate: 1000,           // 1000 requests per minute
      timeUnit: '1m',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% under 2s
    http_req_failed: ['rate<0.01'],      // <1% failure
  },
};

const WEBHOOK_URL = 'https://uyoksdrpwlukwnklhwru.supabase.co/functions/v1/device-webhook';
const DEVICE_SERIAL = 'LOAD-TEST-DEVICE';
const DEVICE_SECRET = 'your-test-secret';

export default function () {
  const nonce = `load-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = JSON.stringify({
    logs: Array.from({ length: 10 }, (_, i) => ({
      pin: `LOAD-${i}`,
      sn: DEVICE_SERIAL,
      timestamp: new Date().toISOString(),
      status: 0,
    })),
  });

  const res = http.post(WEBHOOK_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': DEVICE_SERIAL,
      'x-device-secret': DEVICE_SECRET,
      'x-nonce': nonce,
      'x-timestamp': new Date().toISOString(),
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has success': (r) => JSON.parse(r.body).success === true,
  });

  sleep(0.1);
}
```

### Expected Performance Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Webhook response time (p95) | <2s | <5s |
| Concurrent webhook connections | 50+ | 20+ |
| Logs processed per minute | 1000+ | 500+ |
| Database write latency | <100ms | <500ms |
| Dashboard page load | <3s | <5s |

### Scaling Recommendations

1. **Database**: Add indexes on `attendance(student_id, attendance_date)` and `students(biometric_id)`
2. **Edge Functions**: Supabase auto-scales, but consider batch inserts for high throughput
3. **Frontend**: Implement pagination for large attendance lists
4. **Nonce cleanup**: Schedule periodic deletion of old webhook_nonces (>24h)

---

## 9️⃣ PRODUCTION READINESS CHECKLIST

### Environment & Security ✅

- [ ] All secrets stored in Supabase secrets (not in code)
- [ ] `verify_jwt = false` only for webhook/auto-sync endpoints
- [ ] RLS policies enabled on all tables
- [ ] `has_role()` security definer function used for role checks
- [ ] CORS headers configured correctly
- [ ] Device secret keys are randomly generated (not guessable)
- [ ] Webhook nonce replay protection active
- [ ] Timestamp freshness validation (5-min window)
- [ ] Audit logging for failed auth attempts

### Database ✅

- [ ] All foreign keys properly defined
- [ ] Unique constraints on `(student_id, attendance_date)`
- [ ] Indexes on frequently queried columns
- [ ] Soft delete (`is_deleted`) used instead of hard delete
- [ ] Webhook nonces table with cleanup strategy
- [ ] Backups configured (Supabase daily backups)

### Application ✅

- [ ] Error boundaries in React app
- [ ] Loading states for all async operations
- [ ] Toast notifications for user actions
- [ ] Form validation (client-side + server-side)
- [ ] Responsive design for mobile access
- [ ] 404 page for unknown routes

### Monitoring ✅

- [ ] Supabase dashboard for DB monitoring
- [ ] Edge function logs accessible
- [ ] Sync logs tracked in `device_sync_logs`
- [ ] Audit logs tracked in `audit_logs`
- [ ] Device online/offline status tracking
- [ ] Error alerts for failed syncs

### Deployment ✅

- [ ] Preview tested thoroughly
- [ ] Published to production URL
- [ ] DNS/custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Supabase/Lovable)
- [ ] Rate limiting on webhook endpoint (consider Supabase Edge Function limits)
- [ ] Cron job scheduled for auto-sync (pg_cron + pg_net)

---

## 🏁 GO-LIVE CHECKLIST

```
PRE-LAUNCH
├── ✅ All unit tests passing
├── ✅ Integration tests completed
├── ✅ Role-based access verified
├── ✅ Webhook security tested
├── ✅ Load test passed (1000 logs/min)
├── ✅ Database constraints validated
├── ✅ Frontend tested across browsers
├── ✅ Mobile responsiveness verified
├── ✅ Error handling covers edge cases
└── ✅ Monitoring/alerting configured

LAUNCH DAY
├── 🔲 Publish latest code
├── 🔲 Verify production URL accessible
├── 🔲 Test webhook from real device
├── 🔲 Verify auto-sync cron running
├── 🔲 Admin login successful
├── 🔲 Teacher login successful
├── 🔲 First attendance record flows through
└── 🔲 Monitor logs for 30 minutes

POST-LAUNCH
├── 🔲 Monitor sync logs daily (first week)
├── 🔲 Check device online status
├── 🔲 Verify attendance data accuracy
├── 🔲 Collect teacher feedback
├── 🔲 Schedule nonce cleanup job
└── 🔲 Plan v2 features
```
