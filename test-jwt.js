// Простой тест JWT аутентификации
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testAuth() {
  console.log('🔐 Тестирование JWT аутентификации...\n');
  
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
    console.log('📄 Токен:', loginData.access_token.substring(0, 50) + '...');
    
    const token = loginData.access_token;
    
    // 2. Создание сделки с токеном
    console.log('\n2. Создание тестовой сделки...');
    const dealData = {
      title: `Тестовая сделка ${new Date().toLocaleString()}`,
      description: 'Создана для тестирования JWT аутентификации',
      amount: 150000,
      probability: 75
    };
    
    const createDealResponse = await fetch(`${API_URL}/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dealData)
    });
    
    const dealResponse = await createDealResponse.json();
    
    if (!createDealResponse.ok) {
      console.error('❌ Ошибка создания сделки:', dealResponse);
      return;
    }
    
    console.log('✅ Сделка создана!');
    console.log('🆔 ID сделки:', dealResponse.id);
    console.log('👤 Создана пользователем:', dealResponse.createdBy || 'N/A');
    
    const dealId = dealResponse.id;
    
    // 3. Получение истории сделки
    console.log('\n3. Получение истории сделки...');
    const historyResponse = await fetch(`${API_URL}/deals/${dealId}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const historyData = await historyResponse.json();
    
    if (!historyResponse.ok) {
      console.error('❌ Ошибка получения истории:', historyData);
      return;
    }
    
    console.log('✅ История получена!');
    console.log('📊 Всего записей:', historyData.total);
    console.log('📄 Записи на первой странице:', historyData.items.length);
    
    if (historyData.items.length > 0) {
      const firstChange = historyData.items[0];
      console.log('🔄 Первое изменение:');
      console.log('   - Тип:', firstChange.changeType);
      console.log('   - Пользователь:', firstChange.userName || firstChange.userId);
      console.log('   - Дата:', new Date(firstChange.createdAt).toLocaleString());
    }
    
    // 4. Обновление сделки
    console.log('\n4. Обновление сделки...');
    const updateResponse = await fetch(`${API_URL}/deals/${dealId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        description: 'Обновлено через тест JWT аутентификации',
        probability: 80
      })
    });
    
    const updateData = await updateResponse.json();
    
    if (!updateResponse.ok) {
      console.error('❌ Ошибка обновления сделки:', updateData);
      return;
    }
    
    console.log('✅ Сделка обновлена!');
    
    // 5. Проверка истории после обновления
    console.log('\n5. Проверка истории после обновления...');
    const finalHistoryResponse = await fetch(`${API_URL}/deals/${dealId}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const finalHistoryData = await finalHistoryResponse.json();
    
    if (finalHistoryResponse.ok) {
      console.log('✅ Обновленная история получена!');
      console.log('📊 Всего записей:', finalHistoryData.total);
      console.log('📈 Изменений добавилось:', finalHistoryData.total - historyData.total);
      
      // Показать последние изменения
      console.log('\n📝 Последние изменения:');
      finalHistoryData.items.slice(0, 3).forEach((change, index) => {
        console.log(`   ${index + 1}. ${change.changeType} (${change.userName || change.userId}) - ${new Date(change.createdAt).toLocaleString()}`);
      });
    }
    
    console.log('\n🎉 Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка сети:', error.message);
  }
}

// Проверяем, что node-fetch установлен
try {
  require('node-fetch');
  testAuth();
} catch (error) {
  console.log('❌ node-fetch не установлен. Установите: npm install node-fetch@2');
  console.log('Или используйте встроенный fetch в новых версиях Node.js');
  console.log('Ошибка:', error.message);
}