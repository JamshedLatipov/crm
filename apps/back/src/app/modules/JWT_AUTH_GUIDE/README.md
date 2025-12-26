````markdown
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

... (full content moved)

````
