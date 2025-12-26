# Deals Module — Reference

Source folder: `apps/back/src/app/modules/deals`

Common API endpoints:
- GET /api/deals
- GET /api/deals/:id
- POST /api/deals
- PATCH /api/deals/:id
- PATCH /api/deals/:id/stage

Example create:

```bash
curl -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{ "title": "New Deal", "amount": 100000, "currency": "RUB", "contactId": "..." }'
```

DTOs: `CreateDealDto`, `UpdateDealDto`
