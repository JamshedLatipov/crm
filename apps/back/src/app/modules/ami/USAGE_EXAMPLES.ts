/**
 * Пример использования Queue Status Redis Service
 * 
 * Этот файл показывает, как использовать новую систему хранения
 * статуса операторов и каналов в Redis
 */

/**
 * ============================================
 * 1. АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ (через AMI события)
 * ============================================
 * 
 * Система автоматически обновляет Redis при получении AMI событий:
 * - Когда оператор присоединяется к очереди → Redis обновляется
 * - Когда оператор паузируется → Redis обновляется
 * - Когда вызов начинается → Redis обновляется
 * - Когда вызов заканчивается → Redis очищается
 * 
 * Это происходит в AmiService.handleStatusUpdate()
 */

/**
 * ============================================
 * 2. REST API ПРИМЕРЫ
 * ============================================
 */

// Получить всех операторов со статусом
// curl http://localhost:3000/api/queue-status/operators

// Получить операторов конкретной очереди
// curl http://localhost:3000/api/queue-status/operators/queue/sales

// Получить конкретного оператора
// curl http://localhost:3000/api/queue-status/operators/PJSIP%2F1001

// Получить все каналы (вызовы)
// curl http://localhost:3000/api/queue-status/channels

// Получить все очереди со статусом
// curl http://localhost:3000/api/queue-status/queues

// Получить полный снимок (все данные одного запроса)
// curl http://localhost:3000/api/queue-status/snapshot

/**
 * ============================================
 * 3. ПРИМЕРЫ В КОДЕ (NestJS сервисы)
 * ============================================
 */

// Пример 1: В ContactCenterService (автоматически)
// ContactCenterService.getOperatorsSnapshot() автоматически использует Redis

// Пример 2: Инъекция RedisQueueStatusService в свой сервис
// import { RedisQueueStatusService } from './ami/redis-queue-status.service';
//
// @Injectable()
// export class MyCustomService {
//   constructor(private redisStatus: RedisQueueStatusService) {}
//
//   async getQueueStats(queueName: string) {
//     // Получить всех операторов очереди (из Redis, актуально)
//     const operators = await this.redisStatus.getQueueOperators(queueName);
//     
//     // Получить статус всех каналов (вызовов)
//     const channels = await this.redisStatus.getAllChannels();
//     
//     // Получить статус очереди
//     const queueStatus = await this.redisStatus.getQueueStatus(queueName);
//     
//     return {
//       operators,
//       channels,
//       queueStatus
//     };
//   }
// }

// Пример 3: Полный снимок через сервис
// const snapshot = await this.redisStatus.getFullSnapshot();
// console.log(snapshot.operators); // OperatorStatusData[]
// console.log(snapshot.channels);  // ChannelStatusData[]
// console.log(snapshot.queues);    // QueueStatusData[]

/**
 * ============================================
 * 4. МОНИТОРИНГ И ОТЛАДКА
 * ============================================
 */

// Проверить, что Redis работает:
// redis-cli ping
// Ответ: PONG

// Посмотреть все операторы в Redis:
// redis-cli
// > KEYS queue:operator:*
// > GET queue:operator:PJSIP/1001

// Посмотреть все каналы:
// redis-cli KEYS channel:*

// Посмотреть все индексы:
// redis-cli SMEMBERS queue:operators:all
// redis-cli SMEMBERS channels:all
// redis-cli SMEMBERS queues:all

// Посчитать количество операторов:
// redis-cli SCARD queue:operators:all

/**
 * ============================================
 * 5. ТЕСТИРОВАНИЕ (вручную установить статус)
 * ============================================
 */

// Установить статус оператора (для тестирования)
// curl -X POST http://localhost:3000/api/queue-status/operators \
//   -H "Content-Type: application/json" \
//   -d '{
//     "memberId": "PJSIP/1001",
//     "memberName": "PJSIP/1001",
//     "queueName": "sales",
//     "paused": false,
//     "status": "idle",
//     "updatedAt": 1703337600000
//   }'

// Установить статус канала
// curl -X POST http://localhost:3000/api/queue-status/channels \
//   -H "Content-Type: application/json" \
//   -d '{
//     "channelId": "SIP/2001-00000001",
//     "channelName": "SIP/2001-00000001",
//     "state": "up",
//     "extension": "2001",
//     "updatedAt": 1703337600000
//   }'

// Установить статус очереди
// curl -X POST http://localhost:3000/api/queue-status/queues \
//   -H "Content-Type: application/json" \
//   -d '{
//     "queueName": "sales",
//     "totalMembers": 5,
//     "activeMembers": 3,
//     "callsWaiting": 2,
//     "updatedAt": 1703337600000
//   }'

// Удалить конкретного оператора из Redis
// curl -X DELETE http://localhost:3000/api/queue-status/operators/PJSIP%2F1001

// Очистить ВСЕ данные из Redis (осторожно!)
// curl -X DELETE http://localhost:3000/api/queue-status/clear

/**
 * ============================================
 * 6. ТИПЫ ДАННЫХ ДЛЯ ИСПОЛЬЗОВАНИЯ В КОДЕ
 * ============================================
 */

// OperatorStatusData:
type OperatorStatusExample = {
  memberId: string;               // "PJSIP/1001"
  memberName: string;             // "PJSIP/1001"
  queueName: string;              // "sales"
  paused: boolean;                // false
  status: 'idle' | 'in_call' | 'paused' | 'offline';
  currentCallId?: string;         // "1234567890.1"
  updatedAt: number;              // Date.now()
  wrapUpTime?: number;            // 30 (seconds)
};

// ChannelStatusData:
type ChannelStatusExample = {
  channelId: string;              // "SIP/2001-00000001"
  channelName: string;            // "SIP/2001-00000001"
  state: 'down' | 'reserved' | 'off_hook' | 'dialing' | 'ring' | 'up' | 'busy';
  extension?: string;             // "2001"
  context?: string;               // "from-internal"
  priority?: number;              // 1
  updatedAt: number;              // Date.now()
  callDuration?: number;          // 65 (seconds)
};

// QueueStatusData:
type QueueStatusExample = {
  queueName: string;              // "sales"
  totalMembers: number;           // 5
  activeMembers: number;          // 3
  callsWaiting: number;           // 2
  longestWaitTime?: number;       // 180 (seconds)
  updatedAt: number;              // Date.now()
};

/**
 * ============================================
 * 7. ПРОИЗВОДИТЕЛЬНОСТЬ И ЛУЧШИЕ ПРАКТИКИ
 * ============================================
 */

// Redis в памяти → очень быстро (~ 1ms)
// БД на диске → медленнее (~ 10-50ms)
// Поэтому ContactCenterService сначала проверяет Redis, потом БД

// TTL = 1 час
// Если нет обновлений 1 час → данные автоматически удаляются из Redis
// Это предотвращает утечку памяти Redis

// Для большых систем (10k+ операторов):
// - Используйте Redis Cluster
// - Батчируйте AMI события (несколько событий за раз)
// - Сократите TTL если память критична

/**
 * ============================================
 * 8. ИНТЕГРАЦИЯ С ВАШИМ ФРОНТЕНД ПРИЛОЖЕНИЕМ
 * ============================================
 */

// Angular пример:
/*
@Injectable({ providedIn: 'root' })
export class QueueStatusService {
  constructor(private http: HttpClient) {}

  getOperators() {
    return this.http.get('/api/queue-status/operators');
  }

  getQueueOperators(queueName: string) {
    return this.http.get(`/api/queue-status/operators/queue/${queueName}`);
  }

  getFullSnapshot() {
    return this.http.get('/api/queue-status/snapshot');
  }

  // Полировать каждые 5 секунд
  startPolling() {
    return interval(5000).pipe(
      switchMap(() => this.getFullSnapshot())
    );
  }
}

// В компоненте:
operators$ = this.queueService.startPolling().pipe(
  map(snapshot => snapshot.data.operators)
);
*/

/**
 * ============================================
 * 9. ОБРАБОТКА ОШИБОК И FALLBACK
 * ============================================
 */

// Если Redis недоступен:
// 1. ContactCenterService автоматически падает на БД
// 2. Система продолжает работать, но медленнее
// 3. Логируется ошибка: "[RedisQueueStatusService] Failed to ..."

// Если AMI не подключен:
// 1. Redis не обновляется в реальном времени
// 2. Данные в Redis остаются старыми (до TTL)
// 3. После TTL ключи удаляются

/**
 * ============================================
 * 10. МИГРАЦИЯ С ТЕСТИРОВАНИЯ НА PRODUCTION
 * ============================================
 */

// Этап 1: Параллельная работа (оба источника)
// - Redis обновляется через AMI события
// - ContactCenterService использует Redis если доступна
// - Fallback на БД работает

// Этап 2: Полная миграция
// - Redis содержит актуальные данные
// - БД используется только для конфигурации
// - Можно отключить fallback для производительности

// Этап 3 (опционально): Убрать код fallback
// - Если уверены в надежности Redis
// - Уберите try-catch в ContactCenterService
// - Простой и быстрый код

// Откат:
// - Вернуть fallback на БД
// - Остановить обновления Redis в AmiService
// - Система работает из БД как раньше
