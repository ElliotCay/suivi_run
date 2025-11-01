# Strava Sync - Quick Reference Guide

## Problem Summary

**Issue 1:** Sync returns "0 activités importées"
**Cause:** System date set to 2025 instead of 2024
**Status:** ✅ FIXED with automatic fallback

**Issue 2:** 2km PR seems wrong
**Cause:** No bug - PR value is correct (9:19)
**Status:** ✅ VERIFIED - No action needed

## Quick Commands

### Check Database Stats
```bash
# Count workouts by source
sqlite3 running_tracker.db "SELECT source, COUNT(*) FROM workouts GROUP BY source;"

# Check 2km PR
sqlite3 running_tracker.db "SELECT * FROM personal_records WHERE distance = '2km' AND is_current = 1;"

# View all current PRs
sqlite3 running_tracker.db "SELECT distance, time_seconds FROM personal_records WHERE is_current = 1 ORDER BY distance;"
```

### Trigger Manual Sync
```bash
# Sync activities
curl -X POST "http://localhost:8000/api/strava/sync?user_id=1&limit=30"

# Check connection status
curl "http://localhost:8000/api/strava/status?user_id=1"

# View current PRs
curl "http://localhost:8000/api/records?user_id=1"
```

### Reset Sync (if needed)
```bash
# Reset last_sync to force full re-sync
sqlite3 running_tracker.db "UPDATE strava_connections SET last_sync = NULL WHERE user_id = 1;"
```

## Enhanced Logging

The sync function now logs:

1. **Initial Info:**
   - Whether syncing from last_sync or full sync
   - WARNING if last_sync is in the future (date issue)
   - Total activities fetched from Strava

2. **Activity Breakdown:**
   - Types of activities (Run, Swim, Walk, Hike, etc.)
   - How many of each type

3. **Per Activity:**
   - Activity ID, name, type, and date
   - Whether it's being skipped and why
   - Stream fetching success/failure
   - Best efforts calculated
   - PR updates

4. **Final Summary:**
   - Total activities processed
   - Imported vs skipped counts
   - Skip reasons breakdown
   - PRs updated count

## Example Log Output

```
INFO - Fetched 30 activities from Strava API
INFO - Activity types breakdown: {'Run': 20, 'Swim': 6, 'Walk': 1, 'Hike': 3}
INFO - Processing activity 1/30: Morning Run (ID: 12345, Type: Run, Date: 2024-10-27)
INFO -   -> Activity 12345 is new, fetching detailed streams...
INFO -   -> Successfully fetched streams: ['time', 'distance', 'latlng', 'heartrate']
INFO -   -> Workout metrics: distance=5.2km, duration=1523s, avg_pace=293s/km
INFO -   -> Best efforts calculated: ['500m', '1km', '2km', '5km']
INFO -      - 500m: 145s
INFO -      - 1km: 295s
INFO -      - 2km: 600s
INFO -      - 5km: 1520s
INFO -   -> Successfully added workout 12345 to database
INFO -   -> Set 1 new personal records!
INFO -      - New PR for 5km: 1520s

================================================================================
STRAVA SYNC SUMMARY for user 1:
  Total activities fetched: 30
  Activities imported: 20
  Activities skipped: 10
  Skip reasons:
    - Non-Run type: 10
    - Already exists: 0
    - Conversion failed: 0
    - Errors: 0
  Personal records updated: 1
  Last sync: 2024-10-31T14:30:00
================================================================================
```

## Current PRs (As of Investigation)

| Distance | Time  | Seconds | Date Achieved |
|----------|-------|---------|---------------|
| 400m     | 1:34  | 94      | Oct 30, 2025  |
| 500m     | 2:10  | 130     | Oct 30, 2025  |
| 800m     | 3:33  | 213     | Oct 27, 2025  |
| 1km      | 4:28  | 268     | Oct 27, 2025  |
| 1 mile   | 7:21  | 441     | Oct 27, 2025  |
| **2km**  | **9:19** | **559** | **Oct 27, 2025** |
| 3km      | 14:36 | 876     | Oct 27, 2025  |
| 5km      | 24:24 | 1464    | Oct 16, 2025  |
| 10km     | 57:48 | 3468    | Oct 18, 2025  |

## What Was Fixed

1. **Comprehensive Logging** - Now you can see exactly what's happening during sync
2. **Future Timestamp Detection** - Automatically falls back to 90 days ago if last_sync is in future
3. **Skip Reasons Tracking** - Know why activities aren't being imported
4. **Best Efforts Logging** - See all calculated times for each activity
5. **PR Update Notifications** - Clear logging when PRs are updated

## Files Modified

- `/Users/elliotcayuela/PythonTools/suivi_run/backend/services/strava_service.py`
  - Enhanced `sync_strava_activities()` function with logging and date validation

## Next Steps

1. **Fix System Date** - Change from 2025 to 2024 (if not already done)
2. **Test Sync** - Run a manual sync and check logs
3. **Monitor** - Use the enhanced logging to debug future issues

## Support

For detailed investigation report, see: `DEBUG_REPORT.md`
For complete fixes summary, see: `FIXES_SUMMARY.md`
