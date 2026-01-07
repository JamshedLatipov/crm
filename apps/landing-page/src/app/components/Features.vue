<script setup lang="ts">
import { ref, onMounted } from 'vue';

const features = [
  {
    icon: 'groups',
    title: 'Управление контактами',
    description:
      'Централизованная база контактов и компаний с настраиваемыми полями, историей взаимодействий и умным поиском.',
    color: '#4285f4',
  },
  {
    icon: 'trending_up',
    title: 'Воронка продаж',
    description:
      'Визуальное управление сделками с drag-and-drop, прогнозированием и автоматическим расчетом конверсии.',
    color: '#8b5cf6',
  },
  {
    icon: 'phone_in_talk',
    title: 'IP-телефония',
    description:
      'Встроенный WebRTC softphone с интеграцией Asterisk, IVR деревьями, очередями и записью звонков.',
    color: '#10b981',
  },
  {
    icon: 'auto_awesome',
    title: 'Автоматизация',
    description:
      'Умное распределение лидов по правилам, автоматические задачи и напоминания с учетом SLA.',
    color: '#f59e0b',
  },
  {
    icon: 'analytics',
    title: 'Аналитика и отчеты',
    description:
      'Детальная аналитика продаж, конверсий, производительности команды с настраиваемыми дашбордами.',
    color: '#ef4444',
  },
  {
    icon: 'notifications_active',
    title: 'Уведомления',
    description:
      'Система уведомлений в реальном времени, email рассылки и webhook интеграции с внешними системами.',
    color: '#ec4899',
  },
];

const isVisible = ref(false);

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
        }
      });
    },
    { threshold: 0.1 }
  );

  const section = document.querySelector('#features');
  if (section) {
    observer.observe(section);
  }
});
</script>

<template>
  <section id="features" class="features" :class="{ visible: isVisible }">
    <div class="container">
      <div class="section-header">
        <span class="section-badge">Возможности</span>
        <h2 class="section-title">
          Все инструменты для успешных<br />продаж в одной системе
        </h2>
        <p class="section-description">
          Мощная функциональность для автоматизации продаж, управления клиентами
          и повышения эффективности команды
        </p>
      </div>

      <div class="features-grid">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="feature-card"
          :style="{ '--delay': `${index * 0.1}s`, '--color': feature.color }"
        >
          <div class="feature-icon">
            <span class="material-icons">{{ feature.icon }}</span>
          </div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
          <div class="feature-decoration"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.features {
  padding: 100px 0;
  background: #fff;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    position: relative;
    z-index: 1;
  }

  .section-header {
    text-align: center;
    margin-bottom: 64px;

    .section-badge {
      display: inline-block;
      padding: 8px 20px;
      background: linear-gradient(135deg, #e8f0fe 0%, #d2e3fc 100%);
      color: #1967d2;
      font-size: 14px;
      font-weight: 700;
      border-radius: 50px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.6s ease;
    }

    .section-title {
      font-size: 48px;
      font-weight: 800;
      line-height: 1.2;
      color: #0f172a;
      margin: 0 0 16px;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.6s ease 0.1s;
    }

    .section-description {
      font-size: 18px;
      line-height: 1.6;
      color: #64748b;
      max-width: 640px;
      margin: 0 auto;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.6s ease 0.2s;
    }
  }

  &.visible {
    .section-badge,
    .section-title,
    .section-description {
      opacity: 1;
      transform: translateY(0);
    }

    .feature-card {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 32px;
  }

  .feature-card {
    position: relative;
    padding: 32px;
    background: #fff;
    border: 2px solid #f1f5f9;
    border-radius: 20px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: translateY(30px);
    transition-delay: var(--delay);
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--color) 0%, transparent 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .feature-decoration {
      position: absolute;
      bottom: -50px;
      right: -50px;
      width: 150px;
      height: 150px;
      background: var(--color);
      opacity: 0.05;
      border-radius: 50%;
      transition: all 0.4s ease;
    }

    &:hover {
      transform: translateY(-8px);
      border-color: var(--color);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);

      &::before {
        opacity: 1;
      }

      .feature-icon {
        transform: scale(1.15) rotate(-5deg);
        background: var(--color);

        .material-icons {
          color: #fff;
        }
      }

      .feature-decoration {
        transform: scale(1.2);
        opacity: 0.08;
      }
    }

    .feature-icon {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color), transparent);
      border-radius: 20px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

      .material-icons {
        font-size: 48px;
        color: var(--color);
      }
    }

    .feature-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px;
    }

    .feature-description {
      font-size: 15px;
      line-height: 1.7;
      color: #64748b;
      margin: 0;
    }
  }
}

@media (max-width: 768px) {
  .features {
    padding: 80px 0;

    .section-header {
      margin-bottom: 48px;

      .section-title {
        font-size: 36px;

        br {
          display: none;
        }
      }

      .section-description {
        font-size: 16px;
      }
    }

    .features-grid {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .feature-card {
      padding: 24px;
    }
  }
}
</style>
