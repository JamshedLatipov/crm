# Agent Status Synchronization

## Архитектура

Система управления статусами агентов работает на двух уровнях:

### 1. **CRM Level** (AgentStatusService)
- Хранит статус агента в таблице `agent_statuses`
- 9 статусов: ONLINE, OFFLINE, PAUSE, BREAK, TRAINING, MEETING, WRAP_UP, DO_NOT_DISTURB, ON_CALL
- Tracking времени в каждом статусе
- Метрики производительности (calls today, avg handle time)
- WebSocket broadcast для синхронизации между клиентами

### 2. **Asterisk Level** (QueueMembersService)
- Управляет реальной паузой в Asterisk очередях
- Только два состояния: `paused: true/false`
- Определяет, будет ли агент получать звонки из очереди
- Работает напрямую с AMI (Asterisk Manager Interface)

### 3. **Endpoint Tracking** (EndpointSyncService)
- Автоматическое отслеживание SIP регистраций через AMI/ARI
- Cron job каждые 5 минут
- 4 параллельных метода детекции для максимальной надежности
- Автоматическое обновление AgentStatus при отключении/подключении SIP endpoint

## Синхронизация

### Mapping статусов CRM → Asterisk:

| CRM Status | Asterisk Paused | Получает звонки |
|------------|----------------|-----------------|
| ONLINE | `false` | ✅ Да |
| OFFLINE | `true` | ❌ Нет |
| PAUSE | `true` | ❌ Нет |
| BREAK | `true` | ❌ Нет |
| TRAINING | `true` | ❌ Нет |
| MEETING | `true` | ❌ Нет |
| WRAP_UP | `true` | ❌ Нет |
| DO_NOT_DISTURB | `true` | ❌ Нет |
| ON_CALL | `false` (локально) | ⚠️ Уже на звонке |

### Процесс синхронизации:

#### 1. Регистрация (SIP Login):
```typescript
// SoftphoneComponent.ngOnInit()
softphone.events$ → 'registered'
  ↓
setAgentOnline()
  ↓
AgentStatusService.setAgentOnline(extension)  // CRM DB
  ↓
QueueMembersService.pause({ paused: false })  // Asterisk AMI
```

#### 2. Изменение статуса пользователем:
```typescript
// User selects status from dropdown
SoftphoneStatusBarComponent → (statusChange)
  ↓
SoftphoneComponent.onAgentStatusChange(ev)
  ↓
AgentStatusService.setStatus(extension, status)  // CRM DB + WebSocket
  ↓
QueueMembersService.pause({                      // Asterisk AMI
  paused: status !== ONLINE,
  reason_paused: ev.reason || status
})
```

#### 3. Автоматические переходы:

**Звонок подтвержден:**
```typescript
handleCallConfirmed()
  ↓
currentAgentStatus.set(ON_CALL)  // Только локально, не в Asterisk
```

**Звонок завершен:**
```typescript
handleCallEnded()
  ↓
setAgentWrapUp(callId)
  ↓
AgentStatusService.setAgentWrapUp(extension)     // CRM DB
  ↓
// Note: Asterisk уже отправит агента в wrap-up автоматически
// через wrapuptime в queue configuration
```

**Logout/Disconnect:**
```typescript
setAgentOffline(reason)
  ↓
AgentStatusService.setAgentOffline(extension)    // CRM DB
  ↓
QueueMembersService.pause({                      // Asterisk AMI
  paused: true,
  reason_paused: 'offline'
})
```

#### 4. Автоматическое отслеживание отключений (EndpointSyncService):

**SIP endpoint отключился (закрыт браузер, упала сеть, etc):**
```typescript
// Cron job каждые 5 минут
@Cron(EVERY_5_MINUTES)
syncEndpointStatus()
  ↓
getRegisteredSipEndpoints()  // 4 параллельных AMI метода
  ↓
// Если endpoint не зарегистрирован:
QueueMember.paused = true
QueueMember.reason_paused = 'Auto: SIP not registered'
  ↓
AgentStatus.status = OFFLINE
AgentStatus.reason = 'Auto: SIP not registered'
  ↓
gateway.broadcastAgentStatusChange()  // WebSocket уведомление
```

**SIP endpoint подключился (браузер открыт заново):**
```typescript
// Cron job обнаруживает регистрацию
syncEndpointStatus()
  ↓
// Если endpoint зарегистрирован И был автоматически отключен:
if (member.reason_paused?.startsWith('Auto:')) {
  QueueMember.paused = false
  QueueMember.reason_paused = null
    ↓
  AgentStatus.status = ONLINE
  AgentStatus.reason = 'Auto: SIP registered'
    ↓
  gateway.broadcastAgentStatusChange()
}
// Если был отключен вручную - НЕ восстанавливаем автоматически
```

**Методы детекции SIP endpoint (в порядке надежности):**
1. `Agents` action - queue agents information
2. `PJSIPShowRegistrationInboundContactStatuses` - PJSIP registration status
3. `DeviceStateList` - device state events
4. `QueueStatus` - queue member status (fallback)

> ⚠️ **Важно:** Удалены ненадежные `beforeunload` и `visibilitychange` handlers из frontend. 
> EndpointSyncService обеспечивает надежное отслеживание через AMI независимо от состояния браузера.

## Обработка ошибок

Система спроектирована с graceful degradation:

```typescript
try {
  // Update CRM status (критично)
  await agentStatusSvc.setStatus(...)
  
  try {
    // Sync with Asterisk (желательно, но не критично)
    await queueMembersSvc.pause(...)
  } catch (pauseError) {
    // Log warning, но не падаем
    logger.warn('Failed to sync with Asterisk', pauseError)
  }
} catch (mainError) {
  // Показываем ошибку пользователю
  logger.error('status change error', mainError)
}
```

**Приоритет:**
1. CRM статус всегда обновляется первым (source of truth)
2. Asterisk пауза синхронизируется как best-effort
3. Ошибки синхронизации логируются, но не блокируют работу

## Особенности Asterisk Wrapup

Asterisk имеет встроенный механизм wrap-up time:

```conf
; /etc/asterisk/queues.conf
[queue_name]
wrapuptime = 30  ; Seconds after call before next call
```

Когда звонок завершается:
1. Asterisk автоматически ставит агента в wrap-up на N секунд
2. Наша система также устанавливает статус WRAP_UP в CRM
3. После истечения wrapuptime, Asterisk делает агента доступным
4. Но в CRM статус остается WRAP_UP, пока агент не изменит вручную

**Рекомендация:** Держать `wrapuptime` в Asterisk небольшим (10-30 сек), а управление wrap-up делать через CRM.

## Backend Improvement (TODO)

Для улучшения можно добавить автоматическую синхронизацию на backend:

```typescript
// ContactCenterService.setAgentStatus()
async setAgentStatus(extension: string, status: AgentStatusEnum) {
  // 1. Update DB
  const agentStatus = await this.agentStatusRepo.save(...)
  
  // 2. Sync with Asterisk via AMI
  await this.amiService.queuePause(
    extension,
    status !== AgentStatusEnum.ONLINE,
    status
  )
  
  // 3. Broadcast WebSocket
  this.gateway.broadcastAgentStatusChange(...)
  
  return agentStatus
}
```

Это позволит централизовать логику синхронизации и гарантировать консистентность.

## Мониторинг

Для отладки добавлены логи:

```typescript
// Success logs (info level)
✅ Agent status changed to: <status>
✅ Asterisk queue member pause synced: true/false
✅ Asterisk queue member unpaused
✅ Asterisk queue member paused

// Warning logs (warn level)
⚠️ Failed to sync pause state with Asterisk
⚠️ Failed to unpause in Asterisk
⚠️ Failed to pause in Asterisk

// Error logs (error level)
❌ status change error
❌ Failed to set agent online
❌ Failed to set agent offline
❌ Failed to set agent wrap-up
```

Проверяйте логи в DevTools Console при проблемах с синхронизацией.
