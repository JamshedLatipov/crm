# crm_mono

CRM система с модульной архитектурой на базе Nx monorepo.

## Быстрый старт

### Запуск инфраструктуры

Перед запуском приложения необходимо запустить все необходимые сервисы (PostgreSQL, Redis, RabbitMQ, TURN, Asterisk):

```bash
npm run start:services
# или
yarn start:services
```

### Запуск backend

```bash
npm run start:back
# или
yarn start:back
```

Backend будет доступен на `http://0.0.0.0:3000` (или порт указанный в конфигурации).

### Запуск frontend

```bash
npm run start:front
# или
yarn start:front
```

Frontend будет доступен на `http://0.0.0.0:4200` (или порт указанный в конфигурации).

### Одновременный запуск

Вы можете открыть несколько терминалов для одновременного запуска:

1. **Терминал 1** (инфраструктура): `npm run start:services`
2. **Терминал 2** (backend): `npm run start:back`
3. **Терминал 3** (frontend): `npm run start:front`

## Сборка для production

```bash
# Сборка backend и frontend
npm run build

# Или отдельно:
npm run build:back  # Сборка backend
npm run build:front # Сборка frontend
```

## Тестирование

```bash
npm run test:back  # Тесты backend (Jest)
npm run test:front # Тесты frontend (Vitest)
```

## Документация

Полная документация находится в директории `docs/`:

- [Индекс документации](docs/README.md)
- [Backend документация](docs/back/)
- [Frontend документация](docs/front/)
- [Asterisk документация](docs/asterisk/)

Если вы не можете найти конкретный README здесь, проверьте оригинальные расположения — миграция документации в процессе.

