<script setup lang="ts">
import { ref, onMounted } from 'vue';

const benefits = [
  {
    title: 'Увеличение продаж на 40%',
    description:
      'Автоматизация рутинных задач и умное распределение лидов позволяют менеджерам сфокусироваться на продажах.',
    metric: '+40%',
    icon: '📈',
  },
  {
    title: 'Экономия времени до 3 часов в день',
    description:
      'Автоматические задачи, напоминания и интеграции освобождают время для важных задач.',
    metric: '3ч',
    icon: '⏱️',
  },
  {
    title: 'Снижение потерь лидов на 65%',
    description:
      'Система контроля и напоминаний гарантирует, что ни один лид не останется без внимания.',
    metric: '-65%',
    icon: '🎯',
  },
  {
    title: 'Прозрачность на 100%',
    description:
      'Полная видимость процессов продаж, аналитика в реальном времени и отчетность для принятия решений.',
    metric: '100%',
    icon: '👁️',
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

  const section = document.querySelector('#benefits');
  if (section) {
    observer.observe(section);
  }
});
</script>

<template>
  <section id="benefits" class="benefits" :class="{ visible: isVisible }">
    <div class="benefits-bg"></div>
    <div class="container">
      <div class="section-header">
        <span class="section-badge">Преимущества</span>
        <h2 class="section-title">
          Измеримые результаты для вашего бизнеса
        </h2>
        <p class="section-description">
          Реальные показатели эффективности от компаний, использующих нашу CRM
        </p>
      </div>

      <div class="benefits-grid">
        <div
          v-for="(benefit, index) in benefits"
          :key="index"
          class="benefit-card"
          :style="{ '--delay': `${index * 0.15}s` }"
        >
          <div class="benefit-metric">{{ benefit.metric }}</div>
          <div class="benefit-icon">{{ benefit.icon }}</div>
          <h3 class="benefit-title">{{ benefit.title }}</h3>
          <p class="benefit-description">{{ benefit.description }}</p>
        </div>
      </div>

      <div class="cta-banner">
        <div class="cta-content">
          <h3>Готовы увеличить ваши продажи?</h3>
          <p>Начните использовать CRM уже сегодня и получите первые результаты через неделю</p>
        </div>
        <a href="#contact" class="cta-button">
          Начать бесплатно
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.benefits {
  padding: 100px 0;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
  position: relative;
  overflow: hidden;

  .benefits-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
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
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #d97706;
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

    .benefit-card,
    .cta-banner {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 32px;
    margin-bottom: 64px;
  }

  .benefit-card {
    position: relative;
    padding: 40px 32px;
    background: #fff;
    border-radius: 24px;
    border: 2px solid #f1f5f9;
    text-align: center;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: translateY(30px);
    transition-delay: var(--delay);
    z-index: 1;

    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      background: linear-gradient(135deg, #4285f4, #8b5cf6);
      border-radius: 24px;
      opacity: 0;
      z-index: -1;
      transition: opacity 0.4s ease;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 2px;
      background: #fff;
      border-radius: 22px;
      z-index: -1;
    }

    &:hover {
      transform: translateY(-8px) scale(1.02);
      border-color: transparent;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);

      &::before {
        opacity: 1;
      }

      .benefit-metric {
        transform: scale(1.1);
      }

      .benefit-icon {
        transform: scale(1.2) rotate(10deg);
      }
    }

    .benefit-metric {
      font-size: 48px;
      font-weight: 800;
      background: linear-gradient(135deg, #4285f4 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 12px;
      transition: transform 0.4s ease;
      position: relative;
      z-index: 1;
    }

    .benefit-icon {
      font-size: 40px;
      margin-bottom: 20px;
      display: inline-block;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 1;
    }

    .benefit-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px;
      position: relative;
      z-index: 1;
    }

    .benefit-description {
      font-size: 15px;
      line-height: 1.6;
      color: #64748b;
      margin: 0;
      position: relative;
      z-index: 1;
    }
  }

  .cta-banner {
    background: linear-gradient(135deg, #4285f4 0%, #1967d2 100%);
    border-radius: 24px;
    padding: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    box-shadow: 0 20px 40px rgba(66, 133, 244, 0.3);
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s ease 0.6s;

    .cta-content {
      flex: 1;

      h3 {
        font-size: 32px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 8px;
      }

      p {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.9);
        margin: 0;
      }
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 32px;
      background: #fff;
      color: #1967d2;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      white-space: nowrap;

      svg {
        width: 20px;
        height: 20px;
        stroke-width: 2.5;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      }
    }
  }
}

@media (max-width: 968px) {
  .benefits {
    padding: 80px 0;

    .section-header {
      margin-bottom: 48px;

      .section-title {
        font-size: 36px;
      }
    }

    .benefits-grid {
      grid-template-columns: 1fr;
      gap: 24px;
      margin-bottom: 48px;
    }

    .cta-banner {
      flex-direction: column;
      text-align: center;
      padding: 40px 32px;

      .cta-content {
        h3 {
          font-size: 28px;
        }

        p {
          font-size: 15px;
        }
      }

      .cta-button {
        width: 100%;
        justify-content: center;
      }
    }
  }
}
</style>
