#!/usr/bin/env node

// Тест функциональности назначения лидов через AssignmentService
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testLeadAssignment() {
  console.log('🎯 Тестирование функциональности назначения лидов...\n');

  try {
    // 1. Логин
    console.log('1. Вход в систему...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error('❌ Ошибка логина:', loginData);
      return;
    }

    console.log('✅ Логин успешен!');
    const token = loginData.access_token;

    // 2. Создание тестового лида
    console.log('\n2. Создание тестового лида...');
    const leadData = {
      name: `Тестовый лид ${new Date().toLocaleString()}`,
      email: `test${Date.now()}@example.com`,
      phone: '+7 (999) 123-45-67',
      source: 'website',
      priority: 'high',
      estimatedValue: 50000
    };

    const createLeadResponse = await fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(leadData)
    });

    const leadResponse = await createLeadResponse.json();

    if (!createLeadResponse.ok) {
      console.error('❌ Ошибка создания лида:', leadResponse);
      return;
    }

    console.log('✅ Лид создан!');
    console.log('🆔 ID лида:', leadResponse.id);
    const leadId = leadResponse.id;

    // 3. Назначение лида менеджеру
    console.log('\n3. Назначение лида менеджеру...');
    const assignResponse = await fetch(`${API_URL}/leads/${leadId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ user: '2' }) // Предполагаем, что менеджер с ID 2 существует
    });

    const assignData = await assignResponse.json();

    if (!assignResponse.ok) {
      console.error('❌ Ошибка назначения лида:', assignData);
      return;
    }

    console.log('✅ Лид назначен менеджеру!');

    // 4. Получение текущих назначений лида
    console.log('\n4. Получение текущих назначений лида...');
    const assignmentsResponse = await fetch(`${API_URL}/leads/${leadId}/assignments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const assignmentsData = await assignmentsResponse.json();

    if (!assignmentsResponse.ok) {
      console.error('❌ Ошибка получения назначений:', assignmentsData);
      return;
    }

    console.log('✅ Назначения получены!');
    console.log('👥 Количество назначений:', assignmentsData.length);

    if (assignmentsData.length > 0) {
      const assignment = assignmentsData[0];
      console.log('📋 Детали назначения:');
      console.log('   - ID назначения:', assignment.id);
      console.log('   - Пользователь:', assignment.userId);
      console.log('   - Статус:', assignment.status);
      console.log('   - Дата назначения:', new Date(assignment.createdAt).toLocaleString());
    }

    // 5. Фильтрация лидов по назначенному менеджеру
    console.log('\n5. Фильтрация лидов по назначенному менеджеру...');
    const filterResponse = await fetch(`${API_URL}/leads?assignedTo=2&page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const filterData = await filterResponse.json();

    if (!filterResponse.ok) {
      console.error('❌ Ошибка фильтрации лидов:', filterData);
      return;
    }

    console.log('✅ Фильтрация выполнена!');
    console.log('📊 Найдено лидов:', filterData.total);
    console.log('📄 Лидов на странице:', filterData.leads.length);

    // 6. Получение лидов по менеджеру
    console.log('\n6. Получение лидов по менеджеру...');
    const managerLeadsResponse = await fetch(`${API_URL}/leads/manager/2`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const managerLeadsData = await managerLeadsResponse.json();

    if (!managerLeadsResponse.ok) {
      console.error('❌ Ошибка получения лидов менеджера:', managerLeadsData);
      return;
    }

    console.log('✅ Лиды менеджера получены!');
    console.log('👤 Количество лидов у менеджера:', managerLeadsData.length);

    // 7. Конвертация лида в сделку
    console.log('\n7. Конвертация лида в сделку...');
    const convertResponse = await fetch(`${API_URL}/leads/${leadId}/convert-to-deal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 50000,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stageId: '1', // Предполагаем, что стадия с ID 1 существует
        notes: 'Конвертирован из тестового лида'
      })
    });

    const convertData = await convertResponse.json();

    if (!convertResponse.ok) {
      console.error('❌ Ошибка конвертации лида:', convertData);
      return;
    }

    console.log('✅ Лид конвертирован в сделку!');
    console.log('🆔 ID сделки:', convertData.id);
    console.log('📋 Название сделки:', convertData.title);

    console.log('\n🎉 Все тесты пройдены успешно! Функциональность назначения лидов работает корректно.');

  } catch (error) {
    console.error('❌ Ошибка сети:', error.message);
  }
}

// Проверяем, что node-fetch установлен
try {
  require('node-fetch');
  testLeadAssignment();
} catch (error) {
  console.log('❌ node-fetch не установлен. Установите: npm install node-fetch@2');
  console.log('Или используйте встроенный fetch в новых версиях Node.js');
}