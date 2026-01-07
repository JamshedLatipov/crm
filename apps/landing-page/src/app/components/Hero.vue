<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isVisible = ref(false);

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true;
  }, 100);
});
</script>

<template>
  <section class="hero" :class="{ visible: isVisible }">
    <div class="hero-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <div class="container">
      <div class="hero-content">
        <div class="badge">
          <span class="material-icons">bolt</span>
          vvCRM - Современная система продаж
        </div>

        <h1 class="hero-title">
          Управляйте продажами
          <span class="gradient-text">быстрее и эффективнее</span>
        </h1>

        <p class="hero-description">
          Полнофункциональная CRM с встроенной IP-телефонией, автоматизацией
          продаж и аналитикой. Увеличьте конверсию на 40% с помощью умных
          инструментов управления клиентами.
        </p>

        <div class="hero-actions">
          <a href="#contact" class="btn btn-primary">
            <span>Попробовать бесплатно</span>
            <span class="material-icons">arrow_forward</span>
          </a>
          <a href="#features" class="btn btn-secondary">
            <span class="material-icons">play_circle</span>
            <span>Смотреть видео</span>
          </a>
        </div>

        <div class="hero-stats">
          <div class="stat">
            <div class="stat-value">10K+</div>
            <div class="stat-label">Активных пользователей</div>
          </div>
          <div class="stat">
            <div class="stat-value">98%</div>
            <div class="stat-label">Удовлетворенность</div>
          </div>
          <div class="stat">
            <div class="stat-value">24/7</div>
            <div class="stat-label">Поддержка клиентов</div>
          </div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="mockup">
          <div class="mockup-header">
            <div class="mockup-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="mockup-title">CRM Dashboard</div>
          </div>
          <div class="mockup-content">
            <div class="dashboard-preview">
              <div class="chart-card">
                <div class="chart-header">Продажи за месяц</div>
                <div class="chart">
                  <div class="bar" style="height: 60%"></div>
                  <div class="bar" style="height: 80%"></div>
                  <div class="bar" style="height: 45%"></div>
                  <div class="bar" style="height: 90%"></div>
                  <div class="bar" style="height: 70%"></div>
                  <div class="bar" style="height: 95%"></div>
                </div>
              </div>
              <div class="stat-cards">
                <div class="mini-card">
                  <div class="mini-icon">📈</div>
                  <div class="mini-value">+24%</div>
                  <div class="mini-label">Рост</div>
                </div>
                <div class="mini-card">
                  <div class="mini-icon">💰</div>
                  <div class="mini-value">$45K</div>
                  <div class="mini-label">Доход</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="floating-card card-1">
          <div class="card-icon">📞</div>
          <div class="card-text">
            <div class="card-title">Звонок от клиента</div>
            <div class="card-desc">ООО "Техно Групп"</div>
          </div>
        </div>

        <div class="floating-card card-2">
          <div class="card-icon">✅</div>
          <div class="card-text">
            <div class="card-title">Сделка закрыта</div>
            <div class="card-desc">+$12,500</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  padding: 120px 0 80px;
  overflow: hidden;
  background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 50%, #f0f9ff 100%);
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s ease;

  &.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 0;

    .gradient-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.3;
      animation: float 20s infinite ease-in-out;

      &.orb-1 {
        width: 500px;
        height: 500px;
        background: #4285f4;
        top: -200px;
        left: -100px;
      }

      &.orb-2 {
        width: 400px;
        height: 400px;
        background: #1967d2;
        bottom: -150px;
        right: -100px;
        animation-delay: -5s;
      }

      &.orb-3 {
        width: 350px;
        height: 350px;
        background: #5e97f6;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation-delay: -10s;
      }
    }
  }

  .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
    position: relative;
    z-index: 1;
  }
}

.hero-content {
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #4285f4;
    border-radius: 50px;
    color: #1967d2;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.2);
    animation: slideInLeft 0.8s ease 0.2s backwards;

    .material-icons {
      font-size: 18px;
    }
  }

  .hero-title {
    font-size: 56px;
    font-weight: 800;
    line-height: 1.1;
    margin: 0 0 24px;
    color: #0f172a;
    animation: slideInLeft 0.8s ease 0.3s backwards;

    .gradient-text {
      display: block;
      background: linear-gradient(135deg, #4285f4 0%, #1967d2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  .hero-description {
    font-size: 18px;
    line-height: 1.7;
    color: #475569;
    margin: 0 0 32px;
    max-width: 540px;
    animation: slideInLeft 0.8s ease 0.4s backwards;
  }

  .hero-actions {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 48px;
    animation: slideInLeft 0.8s ease 0.5s backwards;
  }

  .hero-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    padding-top: 32px;
    border-top: 1px solid #e2e8f0;
    animation: slideInLeft 0.8s ease 0.6s backwards;

    .stat {
      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #1967d2;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #64748b;
      }
    }
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;

  .material-icons {
    font-size: 20px;
  }

  &.btn-primary {
    background: linear-gradient(135deg, #4285f4 0%, #1967d2 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(66, 133, 244, 0.4);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(66, 133, 244, 0.5);
    }
  }

  &.btn-secondary {
    background: #fff;
    color: #0f172a;
    border: 2px solid #e2e8f0;

    &:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
  }
}

.hero-visual {
  position: relative;
  animation: slideInRight 0.8s ease 0.4s backwards;

  .mockup {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    border: 1px solid #e2e8f0;

    .mockup-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;

      .mockup-dots {
        display: flex;
        gap: 6px;

        span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #cbd5e1;

          &:nth-child(1) {
            background: #ef4444;
          }
          &:nth-child(2) {
            background: #f59e0b;
          }
          &:nth-child(3) {
            background: #10b981;
          }
        }
      }

      .mockup-title {
        font-size: 13px;
        color: #64748b;
        font-weight: 500;
      }
    }

    .mockup-content {
      padding: 24px;
    }
  }

  .dashboard-preview {
    .chart-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;

      .chart-header {
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 16px;
      }

      .chart {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        height: 120px;

        .bar {
          flex: 1;
          background: linear-gradient(180deg, #4285f4 0%, #1967d2 100%);
          border-radius: 4px 4px 0 0;
          animation: growBar 1s ease 0.8s backwards;
        }
      }
    }

    .stat-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;

      .mini-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        text-align: center;

        .mini-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .mini-value {
          font-size: 20px;
          font-weight: 700;
          color: #1967d2;
          margin-bottom: 4px;
        }

        .mini-label {
          font-size: 12px;
          color: #64748b;
        }
      }
    }
  }

  .floating-card {
    position: absolute;
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #e2e8f0;

    .card-icon {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: #f0fdfa;
      border-radius: 8px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .card-desc {
      font-size: 12px;
      color: #64748b;
    }

    &.card-1 {
      top: 20%;
      right: -40px;
      animation: float 6s infinite ease-in-out;
    }

    &.card-2 {
      bottom: 15%;
      left: -40px;
      animation: float 6s infinite ease-in-out 3s;
    }
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes growBar {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

@media (max-width: 1024px) {
  .hero {
    padding: 80px 0 60px;

    .container {
      grid-template-columns: 1fr;
      gap: 60px;
    }

    .hero-content {
      text-align: center;

      .badge,
      .hero-description,
      .hero-actions {
        margin-left: auto;
        margin-right: auto;
      }

      .hero-title {
        font-size: 42px;
      }

      .hero-stats {
        justify-content: center;
      }
    }

    .hero-visual {
      .floating-card {
        &.card-1 {
          right: 20px;
        }
        &.card-2 {
          left: 20px;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .hero {
    .hero-content {
      .hero-title {
        font-size: 36px;
      }

      .hero-description {
        font-size: 16px;
      }

      .hero-stats {
        grid-template-columns: 1fr;
        gap: 16px;

        .stat {
          .stat-value {
            font-size: 28px;
          }
        }
      }

      .hero-actions {
        flex-direction: column;
        width: 100%;

        .btn {
          width: 100%;
          justify-content: center;
        }
      }
    }

    .hero-visual {
      .floating-card {
        display: none;
      }
    }
  }
}
</style>
