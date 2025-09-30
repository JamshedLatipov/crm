# JWT Аутентификация - Руководство по тестированию

## Что реализовано

✅ **Backend аутентификация:**
- JWT tokens с полями: `sub` (userId), `username`, `roles`
- Все endpoints сделок защищены аутентификацией
- Автоматическое отслеживание пользователей в истории изменений

✅ **Frontend аутентификация:**
- AuthService с методами login/logout/getToken
- HTTP Interceptor для автоматической отправки токенов
- AuthGuard для защиты маршрутов
- Компонент логина

## Тестовые данные

**Пользователь для тестирования:**
- Username: `admin`
- Password: `admin123`

## Как тестировать

### 1. Запуск приложения

```bash
# Терминал 1: База данных и инфраструктура
npm run start:services

# Терминал 2: Backend API
npm run start:back

# Терминал 3: Frontend
npm run start:front
```

### 2. Тест через браузер

1. Откройте http://localhost:4200
2. Автоматически перенаправит на `/login`
3. Введите: `admin` / `admin123`
4. После успешного входа перенаправит на dashboard

### 3. Тест API аутентификации

Откройте http://localhost:4200/auth-test для специального тестового компонента:

- **Статус аутентификации** - показывает текущего пользователя и статус токена
- **Тест /api/deals** - проверяет GET запрос к защищенному endpoint
- **Создать сделку** - проверяет POST запрос с созданием данных

### 4. Тест отслеживания пользователей

1. Войдите в систему как `admin`
2. Создайте сделку через `/auth-test` или `/deals`
3. Откройте созданную сделку → вкладка "История"
4. Проверьте, что все изменения содержат информацию о пользователе

### 5. Ручной тест API

```bash
# 1. Логин
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Ответ: {"access_token": "eyJ..."}

# 2. Использование токена
curl -X GET http://localhost:3000/api/deals \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## Что проверять

### ✅ Успешные сценарии:
- [ ] Логин с правильными данными работает
- [ ] После логина токен сохраняется в localStorage/sessionStorage
- [ ] Защищенные страницы доступны после логина
- [ ] API запросы автоматически содержат Authorization header
- [ ] Создание/изменение сделок работает
- [ ] История сделок показывает username создавшего пользователя

### ❌ Сценарии ошибок:
- [ ] Логин с неправильными данными показывает ошибку
- [ ] Доступ к защищенным страницам без логина перенаправляет на login
- [ ] API запросы без токена возвращают 401 Unauthorized
- [ ] Истекший токен автоматически очищается

## Структура файлов

```
apps/
├── back/src/app/modules/
│   ├── user/
│   │   ├── jwt-auth.guard.ts          # JWT guard для защиты endpoints
│   │   ├── current-user.decorator.ts  # Декоратор для получения user данных
│   │   ├── jwt.strategy.ts            # Passport JWT strategy
│   │   └── user.module.ts             # Экспорт JWT модулей
│   └── deals/
│       ├── deals.controller.ts        # Защищенные endpoints + user tracking
│       └── deals.module.ts            # Импорт UserModule
├── front/src/app/
│   ├── auth/
│   │   ├── auth.service.ts            # Управление токенами
│   │   ├── auth.interceptor.ts        # Автоматическая отправка токенов
│   │   ├── auth.guard.ts              # Защита маршрутов
│   │   └── auth-test.component.ts     # Тестовый компонент
│   ├── login/
│   │   └── login.component.ts         # Форма входа
│   └── app.config.ts                  # Регистрация interceptor
```

## Troubleshooting

**401 Unauthorized:**
- Проверьте, что backend запущен на порту 3000
- Убедитесь, что вы вошли в систему
- Проверьте Network tab - есть ли Authorization header

**Перенаправление на login:**
- Нормально для неавторизованных пользователей
- Проверьте localStorage/sessionStorage на наличие токена

**Ошибки компиляции:**
- Убедитесь, что установлены зависимости: `npm install`
- Проверьте, что все imports корректны

## Следующие шаги

1. **Интеграция с существующими компонентами** - убедиться, что все сделки отправляют токены
2. **Роли пользователей** - добавить проверку ролей (admin/operator/user)
3. **Refresh tokens** - добавить автоматическое обновление токенов
4. **Logout everywhere** - добавить возможность выйти со всех устройств