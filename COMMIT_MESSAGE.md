# Fix: Incorrect analytics reports data

## Problem
Almost all reports on `/contact-center/analytics` were showing incorrect data due to improper call status determination and complex ABANDON conditions.

## Root Cause
The main issue was in `CallAggregationService.aggregateRecentCalls()`:
- Call status was set as `s.answered ? 'ANSWERED' : (s.status || 'NO ANSWER')`
- `s.status` contained CDR disposition, not the actual call status
- Calls abandoned in queue (with `abandonTime > 0`) were marked as 'NO ANSWER'
- This caused incorrect abandoned call counts across all analytics

## Changes Made

### 1. Fixed call status determination in call-aggregation.service.ts
Added proper logic to determine call status:
1. Check if call was answered (ANSWERED)
2. Check if call was abandoned in queue (ABANDON) using `abandonTime > 0`
3. Fallback to CDR disposition for other cases (BUSY, FAILED, NO ANSWER)

### 2. Simplified ABANDON conditions in analytics services
**Before:**
```sql
(cs.status = 'ABANDON' OR (cs.status = 'NO ANSWER' AND cs.abandonTime IS NOT NULL AND cs.abandonTime > 0))
```

**After:**
```sql
cs.status = 'ABANDON'
```

Applied in:
- abandoned-calls.service.ts (main queries + countByAbandonTimeRange)
- queue-performance.service.ts
- calls-overview.service.ts (also optimized missed calls to use IN)

## Files Changed
- apps/back/src/app/modules/calls/services/call-aggregation.service.ts
- apps/back/src/app/modules/analytics/services/abandoned-calls.service.ts
- apps/back/src/app/modules/analytics/services/queue-performance.service.ts
- apps/back/src/app/modules/analytics/services/calls-overview.service.ts

## Migration Required
Run SQL migration to update existing CallSummary records:
```bash
psql -U crm_user -d crm_db -f apps/back/migrations/fix-call-summaries-status.sql
```

Or truncate and rebuild:
```sql
TRUNCATE TABLE call_summaries;
-- CallAggregationService will rebuild from CDR automatically
```

## Affected Reports
✅ Agent Performance - correct answered/missed calls
✅ Calls Overview - proper status distribution
✅ Abandoned Calls - accurate abandon counts
✅ Queue Performance - correct queue metrics
✅ SLA Metrics - proper SLA compliance data
✅ IVR Analysis - correct IVR sessions
✅ Call Conversion - accurate conversion data
