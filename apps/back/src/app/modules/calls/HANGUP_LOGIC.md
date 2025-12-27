=== ЛОГИКА ОПРЕДЕЛЕНИЯ HANGUP_BY ===

Поле hangupBy определяет, кто завершил звонок. Проверка выполняется в следующем приоритете:

ПРИОРИТЕТ 1: События QueueLog (наиболее точные)
------------------------------------------------
1. COMPLETECALLER → 'caller'
   - Клиент завершил звонок после того, как агент ответил
   
2. COMPLETEAGENT → 'agent'
   - Агент завершил звонок после ответа
   
3. ABANDON → 'caller'
   - Клиент завершил звонок ДО того, как агент ответил (отказался от ожидания)
   
4. EXITWITHKEY → 'caller_key'
   - Клиент нажал клавишу для выхода из очереди
   
5. EXITWITHTIMEOUT → 'timeout'
   - Превышено время ожидания в очереди
   
6. EXITEMPTY → 'system'
   - Нет доступных агентов

ПРИОРИТЕТ 2: Анализ CDR (если нет событий QueueLog)
-----------------------------------------------------
7. disposition = 'ANSWERED' + answered = true:
   - Если dstchannel пустой → 'agent' (агент отключился первым)
   - Иначе → 'caller' (клиент отключился первым)
   
8. disposition = 'NO ANSWER' → 'timeout'
   - Никто не ответил

9. disposition = 'BUSY' → 'agent'
   - Агент/система была занята

10. disposition = 'FAILED' → 'system'
    - Системная ошибка

ПРИОРИТЕТ 3: Fallback
----------------------
11. Если звонок был принят (answered = true), но hangupBy не определен → 'unknown'

ПРИМЕРЫ:
--------
Сценарий 1: Клиент позвонил, агент ответил, клиент повесил трубку
  → QueueLog: CONNECT, затем COMPLETECALLER
  → hangupBy = 'caller'

Сценарий 2: Клиент позвонил, агент ответил, агент завершил
  → QueueLog: CONNECT, затем COMPLETEAGENT
  → hangupBy = 'agent'

Сценарий 3: Клиент позвонил, ждал 15 сек, повесил трубку
  → QueueLog: ENTERQUEUE, затем ABANDON
  → hangupBy = 'caller'

Сценарий 4: Клиент позвонил, очередь пуста, система завершила
  → QueueLog: ENTERQUEUE, затем EXITEMPTY
  → hangupBy = 'system'

Сценарий 5: Клиент позвонил, превышен таймаут ожидания
  → QueueLog: ENTERQUEUE, затем EXITWITHTIMEOUT
  → hangupBy = 'timeout'

ЗНАЧЕНИЯ hangupBy:
------------------
- 'caller'      - Клиент завершил звонок
- 'agent'       - Агент завершил звонок
- 'caller_key'  - Клиент вышел нажатием клавиши
- 'timeout'     - Таймаут системы
- 'system'      - Системное завершение
- 'unknown'     - Не удалось определить (редко)
- null          - Звонок не был принят и причина неизвестна
