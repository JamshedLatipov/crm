<script setup lang="ts">
import { ref, onMounted } from 'vue';

const plans = [
  {
    name: 'Базовый',
    price: '$3',
    period: '/пользователь/месяц',
    description: 'Для малого бизнеса и стартапов',
    features: [
      'Неограниченное количество пользователей',
      'Базовая CRM функциональность',
      'Управление контактами',
      'Простая воронка продаж',
      'Email поддержка',
      '1 GB хранилище на пользователя',
    ],
    highlighted: false,
    cta: 'Начать работу',
  },
  {
    name: 'Расширенный',
    price: '$5',
    period: '/пользователь/месяц',
    description: 'Для растущих команд продаж',
    features: [
      'Неограниченное количество пользователей',
      'Все функции Базового',
      'IP-телефония и IVR',
      'Автоматизация задач',
      'Расширенная аналитика',
      'Приоритетная поддержка',
      '5 GB хранилище на пользователя',
      'API доступ',
    ],
    highlighted: true,
    cta: 'Попробовать 14 дней',
  },
  {
    name: 'Профессиональный',
    price: '$10',
    period: '/пользователь/месяц',
    description: 'Для крупного бизнеса',
    features: [
      'Неограниченное количество пользователей',
      'Все функции Расширенного',
      'Выделенный сервер',
      'Кастомные интеграции',
      'Персональный менеджер',
      'SLA гарантия 99.9%',
      'Неограниченное хранилище',
      'Обучение команды',
      'Белый лейбл',
    ],
    highlighted: false,
    cta: 'Связаться с нами',
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

  const section = document.querySelector('#pricing');
  if (section) {
    observer.observe(section);
  }
});
</script>

<template>
  <section id="pricing" class="pricing" :class="{ visible: isVisible }">
    <div class="container">
      <div class="section-header">
        <span class="section-badge">Тарифы</span>
        <h2 class="section-title">Выберите подходящий план</h2>
        <p class="section-description">
          Прозрачные цены без скрытых платежей. Начните бесплатно и масштабируйтесь по мере роста
        </p>
      </div>

      <div class="pricing-grid">
        <div
          v-for="(plan, index) in plans"
          :key="index"
          :class="['pricing-card', { highlighted: plan.highlighted }]"
          :style="{ '--delay': `${index * 0.15}s` }"
        >
          <div v-if="plan.highlighted" class="popular-badge">Популярный</div>

          <div class="plan-header">
            <h3 class="plan-name">{{ plan.name }}</h3>
            <p class="plan-description">{{ plan.description }}</p>
          </div>

          <div class="plan-price">
            <span class="price">{{ plan.price }}</span>
            <span v-if="plan.period" class="period">{{ plan.period }}</span>
          </div>

          <ul class="features-list">
            <li v-for="(feature, idx) in plan.features" :key="idx">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="check-icon"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {{ feature }}
            </li>
          </ul>

          <a
            href="#contact"
            :class="['plan-cta', { primary: plan.highlighted }]"
          >
            {{ plan.cta }}
          </a>
        </div>
      </div>

      <div class="pricing-note">
        <p>
          💡 Все тарифы включают бесплатные обновления и техническую поддержку.
          <br />
          Для НКО и образовательных учреждений действуют специальные условия.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pricing {
  padding: 100px 0;
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
  position: relative;

  .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .section-header {
    text-align: center;
    margin-bottom: 64px;

    .section-badge {
      display: inline-block;
      padding: 8px 20px;
      background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
      color: #3b82f6;
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

    .pricing-card,
    .pricing-note {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 32px;
    margin-bottom: 48px;
  }

  .pricing-card {
    position: relative;
    padding: 40px 32px;
    background: #fff;
    border: 2px solid #e2e8f0;
    border-radius: 24px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: translateY(30px);
    transition-delay: var(--delay);

    &.highlighted {
      border-color: #4285f4;
      box-shadow: 0 20px 60px rgba(66, 133, 244, 0.2);
      transform: scale(1.05);

      .popular-badge {
        display: block;
      }
    }

    &:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);

      &.highlighted {
        transform: translateY(-8px) scale(1.07);
        box-shadow: 0 25px 70px rgba(6, 182, 212, 0.25);
      }
    }

    .popular-badge {
      display: none;
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 20px;
      background: linear-gradient(135deg, #4285f4 0%, #1967d2 100%);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      border-radius: 50px;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
    }

    .plan-header {
      text-align: center;
      margin-bottom: 24px;

      .plan-name {
        font-size: 28px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 8px;
      }

      .plan-description {
        font-size: 14px;
        color: #64748b;
        margin: 0;
      }
    }

    .plan-price {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 2px solid #f1f5f9;

      .price {
        font-size: 48px;
        font-weight: 800;
        color: #1967d2;
        display: inline-block;
      }

      .period {
        font-size: 18px;
        color: #64748b;
        margin-left: 4px;
      }
    }

    .features-list {
      list-style: none;
      padding: 0;
      margin: 0 0 32px;

      li {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 0;
        font-size: 15px;
        color: #475569;

        .check-icon {
          flex-shrink: 0;
          stroke-width: 3;
          color: #10b981;
          margin-top: 2px;
        }
      }
    }

    .plan-cta {
      display: block;
      width: 100%;
      padding: 16px;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.3s ease;
      border: 2px solid #e2e8f0;
      background: #fff;
      color: #0f172a;

      &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        transform: translateY(-2px);
      }

      &.primary {
        background: linear-gradient(135deg, #4285f4 0%, #1967d2 100%);
        color: #fff;
        border: none;
        box-shadow: 0 4px 14px rgba(66, 133, 244, 0.4);

        &:hover {
          background: linear-gradient(135deg, #1967d2 0%, #1557b0 100%);
          box-shadow: 0 6px 20px rgba(66, 133, 244, 0.5);
        }
      }
    }
  }

  .pricing-note {
    text-align: center;
    padding: 32px;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-radius: 16px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease 0.6s;

    p {
      margin: 0;
      font-size: 15px;
      color: #78350f;
      line-height: 1.7;
    }
  }
}

@media (max-width: 1024px) {
  .pricing {
    .pricing-grid {
      grid-template-columns: 1fr;

      .pricing-card.highlighted {
        transform: scale(1);

        &:hover {
          transform: translateY(-8px) scale(1.02);
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .pricing {
    padding: 80px 0;

    .section-header {
      margin-bottom: 48px;

      .section-title {
        font-size: 36px;
      }
    }

    .pricing-card {
      padding: 32px 24px;
    }
  }
}
</style>
