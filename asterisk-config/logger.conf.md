# logger.conf

**Purpose:** Logging configuration for Asterisk (which logs are written where and rotation).

**Notes / Recommendations:**
- Configure separate logs for full verbose, console, and cron-friendly summaries.
- Use log rotation and ensure logs are mounted/persisted outside containers for troubleshooting.