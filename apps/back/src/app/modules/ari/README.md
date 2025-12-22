# Модуль ARI (Asterisk REST Interface)

## Описание
Модуль предоставляет низкоуровневую интеграцию с Asterisk через ARI (Asterisk REST Interface). Служит "мостом" между CRM и телефонией.

## Функциональность
- Подключение к Asterisk WebSocket.
- Создание и управление каналами (channels), мостами (bridges) и воспроизведением (playback).
- Обработка событий от Asterisk (StasisStart, StasisEnd, DTMF).

## Компоненты
- `AriService`: Основной сервис, инициализирующий клиент `ari-client`.
- `AriController`: API для диагностики и ручного управления (при необходимости).
