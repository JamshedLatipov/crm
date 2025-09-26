#!/usr/bin/env node

// Простой тест API для создания тестовых менеджеров
const http = require('http');

const postData = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/users/seed-managers',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Статус код: ${res.statusCode}`);
  console.log(`Заголовки: ${JSON.stringify(res.headers)}`);
  
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`Ответ: ${chunk}`);
  });
  
  res.on('end', () => {
    console.log('Тестовые менеджеры созданы!');
  });
});

req.on('error', (e) => {
  console.error(`Ошибка запроса: ${e.message}`);
});

req.write(postData);
req.end();
