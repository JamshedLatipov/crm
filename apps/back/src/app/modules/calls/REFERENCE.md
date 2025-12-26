# Calls Module — Reference

Source folder: `apps/back/src/app/modules/calls`

Overview:
- Telephony integration, call records, queue management, transfers, recordings.

Common API endpoints (examples):
- GET /api/calls — list recent calls
- GET /api/calls/:id — call details
- POST /api/calls/transfer — initiate transfer
- POST /api/calls/:id/record — start/stop recording

Integration notes:
- Uses Asterisk ARI/AMI for realtime control; see `asterisk-config/` for asterisk setup.
