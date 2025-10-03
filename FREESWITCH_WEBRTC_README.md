# FreeSWITCH WebRTC Setup

## Обзор

Настройка FreeSWITCH для работы с WebRTC клиентами через Verto протокол.

## Структура конфигурации

```
freeswitch-config/
├── vars.xml                           # Глобальные переменные
├── autoload_configs/
│   ├── modules.conf.xml              # Загружаемые модули
│   ├── event_socket.conf.xml         # Event Socket Interface (порт 8021)
│   └── verto.conf.xml                # Verto WebRTC конфигурация
├── sip_profiles/
│   └── internal.xml                   # SIP профиль с WebRTC поддержкой
├── dialplan/
│   └── default.xml                    # Dialplan (правила маршрутизации)
└── directory/
    └── default.xml                    # Пользователи/extensions
```

## Порты

- **5060** (UDP/TCP) - SIP сигнализация
- **8021** (TCP) - Event Socket для интеграции с приложениями
- **8081** (TCP) - WebSocket (ws://) для Verto
- **8082** (TCP) - WebSocket Secure (wss://) для Verto
- **16384-32768** (UDP) - RTP медиа потоки

## Запуск

### 1. Перезапустите контейнер FreeSWITCH

```bash
docker-compose up -d --force-recreate freeswitch
```

### 2. Проверьте логи

```bash
docker-compose logs -f freeswitch
```

### 3. Подключитесь к FreeSWITCH CLI

```bash
docker exec -it crm-freeswitch-1 fs_cli
```

Внутри CLI проверьте статус:
```
sofia status
verto status
```

## Тестирование WebRTC

### Вариант 1: Тестовая HTML страница

1. Откройте `test-freeswitch-webrtc.html` в браузере
2. Введите параметры подключения:
   - **WebSocket URL**: `ws://localhost:8081`
   - **Extension**: `1000`
   - **Password**: `1234`
3. Нажмите **Connect**
4. После подключения наберите `9999` для echo test
5. Или `1001` для звонка на другой extension

### Вариант 2: С использованием библиотеки Verto

Скачайте полную библиотеку verto:
```bash
git clone https://github.com/signalwire/freeswitch
```

Откройте `freeswitch/html5/verto/demo/index.html` в браузере

## Тестовые номера

- **9999** - Echo test (повторяет ваш голос)
- **3000** - Конференция
- **1000, 1001** - Тестовые extensions

## Интеграция с вашим CRM

### Event Socket для управления звонками

FreeSWITCH Event Socket работает на порту **8021**. Вы можете использовать его для:

1. Инициации исходящих звонков
2. Отслеживания статуса звонков
3. Управления активными звонками (hold, transfer, etc.)

### Пример подключения к Event Socket (Node.js)

```javascript
import { ESL } from 'esl';

const conn = new ESL.Connection('localhost', 8021, 'ClueCon', () => {
  console.log('Connected to FreeSWITCH');
  
  conn.subscribe(['CHANNEL_CREATE', 'CHANNEL_ANSWER', 'CHANNEL_HANGUP']);
  
  conn.on('esl::event::CHANNEL_CREATE', (event) => {
    console.log('New channel:', event.getHeader('Channel-Call-UUID'));
  });
  
  conn.on('esl::event::CHANNEL_ANSWER', (event) => {
    console.log('Call answered:', event.getHeader('Channel-Call-UUID'));
  });
  
  conn.on('esl::event::CHANNEL_HANGUP', (event) => {
    console.log('Call ended:', event.getHeader('Channel-Call-UUID'));
  });
});
```

### Создание звонка через Event Socket

```javascript
// Originate a call
conn.api(
  'originate',
  '{origination_caller_id_number=1000}user/1000 &bridge(user/1001)',
  (result) => {
    console.log('Call result:', result.body);
  }
);
```

## Динамическое создание пользователей

Вместо статических пользователей в XML, вы можете использовать:

### 1. PostgreSQL для хранения пользователей

Создайте таблицы:

```sql
CREATE TABLE freeswitch_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  domain VARCHAR(100) DEFAULT 'localhost',
  context VARCHAR(50) DEFAULT 'default',
  enabled BOOLEAN DEFAULT true
);

CREATE TABLE freeswitch_directory (
  user_id INTEGER REFERENCES freeswitch_users(id),
  param_name VARCHAR(50),
  param_value TEXT
);
```

### 2. XML CURL для динамической загрузки

Настройте `autoload_configs/xml_curl.conf.xml`:

```xml
<configuration name="xml_curl.conf">
  <bindings>
    <binding name="directory">
      <param name="gateway-url" value="http://back:3000/api/freeswitch/directory" method="GET"/>
    </binding>
  </bindings>
</configuration>
```

Ваш backend должен возвращать XML:

```javascript
// apps/back/src/app/modules/freeswitch/freeswitch.controller.ts
@Get('directory')
async getDirectory(@Query() query) {
  const user = query.user;
  const domain = query.domain;
  
  // Получите пользователя из БД
  const userData = await this.getUserFromDB(user);
  
  // Верните XML
  return `
    <document type="freeswitch/xml">
      <section name="directory">
        <domain name="${domain}">
          <user id="${user}">
            <params>
              <param name="password" value="${userData.password}"/>
            </params>
            <variables>
              <variable name="user_context" value="default"/>
            </variables>
          </user>
        </domain>
      </section>
    </document>
  `;
}
```

## CDR (Call Detail Records)

FreeSWITCH может записывать CDR в PostgreSQL:

### 1. Установите модуль

```bash
docker exec crm-freeswitch-1 fs_cli -x "load mod_cdr_pg_csv"
```

### 2. Настройте `autoload_configs/cdr_pg_csv.conf.xml`

```xml
<configuration name="cdr_pg_csv.conf">
  <settings>
    <param name="db-info" value="host=postgres dbname=crm user=postgres password=postgres"/>
    <param name="default-template" value="example"/>
  </settings>
  <templates>
    <template name="example">INSERT INTO cdr VALUES(...)</template>
  </templates>
</configuration>
```

## Troubleshooting

### WebSocket не подключается

1. Проверьте что порты 8081/8082 открыты:
```bash
docker-compose ps
```

2. Проверьте логи:
```bash
docker-compose logs freeswitch | grep -i verto
```

### Нет звука

1. Проверьте ICE кандидаты в браузере (F12 Console)
2. Убедитесь что TURN сервер работает:
```bash
docker-compose ps turn
```

3. Проверьте RTP порты открыты (16384-32768)

### Не удается зарегистрироваться

1. Проверьте что пользователь существует в `directory/default.xml`
2. Проверьте пароль
3. Посмотрите логи аутентификации:
```bash
docker exec crm-freeswitch-1 fs_cli -x "sofia status profile internal"
```

## Следующие шаги

1. **SSL/TLS сертификаты** - для WSS (защищенного WebSocket)
2. **Интеграция с CRM backend** - использование Event Socket
3. **Динамические пользователи** - через PostgreSQL + XML CURL
4. **CDR в БД** - для хранения истории звонков
5. **SIP Trunk** - для внешних звонков через провайдера

## Полезные команды FreeSWITCH CLI

```bash
# Статус Sofia (SIP)
sofia status

# Статус Verto
verto status

# Список активных звонков
show channels

# Kick пользователя
sofia profile internal kick [user]@[domain]

# Reload конфигурации
reloadxml

# Загрузить модуль
load mod_verto

# Отладка
console loglevel debug
```

## Ресурсы

- [FreeSWITCH Documentation](https://freeswitch.org/confluence/)
- [Verto Communicator](https://github.com/Star2Billing/verto-communicator)
- [Event Socket Library](https://freeswitch.org/confluence/display/FREESWITCH/Event+Socket+Library)
