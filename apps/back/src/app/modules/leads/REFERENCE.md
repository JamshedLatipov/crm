# Leads Module — Reference

Source folder: `apps/back/src/app/modules/leads`

Common API endpoints (examples):
- GET /api/leads — list / filter leads
- GET /api/leads/:id — get lead by id
- POST /api/leads — create lead
- PATCH /api/leads/:id — update lead
- POST /api/leads/:id/convert — convert lead to deal

Example request (create):

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "Ivan", "lastName": "Ivanov", "phone": "+79001234567", "source": "website" }'
```

DTOs / key objects: `CreateLeadDto`, `UpdateLeadDto` (see `*.dto.ts` in module)
