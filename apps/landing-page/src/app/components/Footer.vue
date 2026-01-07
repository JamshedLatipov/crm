<script setup lang="ts">
const currentYear = new Date().getFullYear();

const links = {
  product: [
    { label: 'Возможности', href: '#features' },
    { label: 'Преимущества', href: '#benefits' },
    { label: 'Тарифы', href: '#pricing' },
    { label: 'Галерея', href: '#screenshots' },
  ],
  company: [
    { label: 'О компании', href: '#' },
    { label: 'Блог', href: '#' },
    { label: 'Карьера', href: '#' },
    { label: 'Контакты', href: '#contact' },
  ],
  support: [
    { label: 'Документация', href: '#' },
    { label: 'API', href: '#' },
    { label: 'Поддержка', href: '#' },
    { label: 'Статус системы', href: '#' },
  ],
  legal: [
    { label: 'Политика конфиденциальности', href: '#' },
    { label: 'Условия использования', href: '#' },
    { label: 'Лицензия', href: '#' },
  ],
};

const socials = [
  {
    name: 'Telegram',
    icon: '📱',
    href: '#',
  },
  {
    name: 'LinkedIn',
    icon: '💼',
    href: '#',
  },
  {
    name: 'GitHub',
    icon: '⚙️',
    href: '#',
  },
  {
    name: 'YouTube',
    icon: '▶️',
    href: '#',
  },
];
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-main">
        <div class="footer-brand">
          <a class="brand-logo" href="#">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="footerGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stop-color="#4285f4" />
                  <stop offset="1" stop-color="#1967d2" />
                </linearGradient>
              </defs>
              <rect width="48" height="48" rx="12" fill="url(#footerGrad)" />
              <text
                x="50%"
                y="54%"
                text-anchor="middle"
                font-size="16"
                fill="#fff"
                font-weight="700"
                dominant-baseline="middle"
              >
                VV
              </text>
            </svg>
          </a>
          <p class="brand-description">
            VVCRM - Современная система для автоматизации продаж и повышения
            эффективности команды
          </p>
          <div class="socials">
            <a
              v-for="social in socials"
              :key="social.name"
              :href="social.href"
              :aria-label="social.name"
              class="social-link"
            >
              {{ social.icon }}
            </a>
          </div>
        </div>

        <div class="footer-links">
          <div class="links-column">
            <h3>Продукт</h3>
            <ul>
              <li v-for="link in links.product" :key="link.label">
                <a :href="link.href">{{ link.label }}</a>
              </li>
            </ul>
          </div>

          <div class="links-column">
            <h3>Компания</h3>
            <ul>
              <li v-for="link in links.company" :key="link.label">
                <a :href="link.href">{{ link.label }}</a>
              </li>
            </ul>
          </div>

          <div class="links-column">
            <h3>Поддержка</h3>
            <ul>
              <li v-for="link in links.support" :key="link.label">
                <a :href="link.href">{{ link.label }}</a>
              </li>
            </ul>
          </div>

          <div class="links-column">
            <h3>Правовая информация</h3>
            <ul>
              <li v-for="link in links.legal" :key="link.label">
                <a :href="link.href">{{ link.label }}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="copyright">
          © {{ currentYear }} <strong>vvCRM</strong>. Все права
          защищены.
        </p>
        <p class="made-with">
          Сделано с
          <span class="heart">❤️</span>
          для роста вашего бизнеса
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  padding: 80px 0 32px;

  .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .footer-main {
    display: grid;
    grid-template-columns: 1.2fr 2fr;
    gap: 64px;
    padding-bottom: 48px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.1);
    margin-bottom: 32px;
  }

  .footer-brand {
    .brand-logo {
      display: inline-block;
      margin-bottom: 20px;
      transition: transform 0.3s ease;

      &:hover {
        transform: scale(1.05);
      }
    }

    .brand-description {
      font-size: 15px;
      line-height: 1.6;
      color: #cbd5e1;
      margin: 0 0 24px;
      max-width: 320px;
    }

    .socials {
      display: flex;
      gap: 12px;

      .social-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        text-decoration: none;
        font-size: 20px;
        transition: all 0.3s ease;

        &:hover {
          background: rgba(66, 133, 244, 0.2);
          border-color: #4285f4;
          transform: translateY(-2px);
        }
      }
    }
  }

  .footer-links {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 32px;

    .links-column {
      h3 {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 16px;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;

        li {
          a {
            font-size: 14px;
            color: #cbd5e1;
            text-decoration: none;
            transition: all 0.2s ease;
            display: inline-block;

            &:hover {
              color: #4285f4;
              transform: translateX(4px);
            }
          }
        }
      }
    }
  }

  .footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;

    .copyright,
    .made-with {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;

      strong {
        color: #fff;
        font-weight: 700;
      }
    }

    .made-with {
      .heart {
        display: inline-block;
        color: #ef4444;
        animation: heartbeat 1.5s infinite;
      }
    }
  }
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  10%,
  30% {
    transform: scale(1.1);
  }
  20%,
  40% {
    transform: scale(1);
  }
}

@media (max-width: 1024px) {
  .footer {
    .footer-main {
      grid-template-columns: 1fr;
      gap: 48px;
    }

    .footer-links {
      grid-template-columns: repeat(2, 1fr);
      gap: 32px;
    }
  }
}

@media (max-width: 768px) {
  .footer {
    padding: 60px 0 24px;

    .footer-main {
      gap: 40px;
      padding-bottom: 32px;
    }

    .footer-brand {
      .brand-description {
        max-width: 100%;
      }
    }

    .footer-links {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .footer-bottom {
      flex-direction: column;
      text-align: center;
      gap: 12px;
    }
  }
}
</style>
