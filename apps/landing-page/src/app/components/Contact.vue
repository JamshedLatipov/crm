<script setup lang="ts">
import { ref, onMounted } from 'vue';

const form = ref({
  name: '',
  email: '',
  phone: '',
  company: '',
  message: '',
});

const formState = ref({
  submitting: false,
  success: false,
  error: '',
});

const isVisible = ref(false);

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function submitForm(e: Event) {
  e.preventDefault();
  formState.value.error = '';
  formState.value.success = false;

  if (!form.value.name || !form.value.email) {
    formState.value.error = 'Пожалуйста, заполните имя и email';
    return;
  }

  if (!validateEmail(form.value.email)) {
    formState.value.error = 'Пожалуйста, введите корректный email';
    return;
  }

  formState.value.submitting = true;

  try {
    // TODO: Replace with actual API endpoint
    await new Promise((resolve) => setTimeout(resolve, 1000));

    formState.value.success = true;
    form.value = {
      name: '',
      email: '',
      phone: '',
      company: '',
      message: '',
    };

    setTimeout(() => {
      formState.value.success = false;
    }, 5000);
  } catch (error) {
    formState.value.error = 'Произошла ошибка. Попробуйте позже.';
  } finally {
    formState.value.submitting = false;
  }
}

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

  const section = document.querySelector('#contact');
  if (section) {
    observer.observe(section);
  }
});
</script>

<template>
  <section id="contact" class="contact" :class="{ visible: isVisible }">
    <div class="container">
      <div class="contact-wrapper">
        <div class="contact-info">
          <span class="section-badge">Связаться с нами</span>
          <h2 class="section-title">Начните использовать vvCRM уже сегодня</h2>
          <p class="section-description">
            Оставьте заявку, и наш специалист свяжется с вами для демонстрации
            системы и ответов на вопросы
          </p>

          <div class="info-cards">
            <div class="info-card">
              <div class="info-icon">
                <span class="material-icons">email</span>
              </div>
              <div class="info-content">
                <div class="info-label">Email</div>
                <div class="info-value">info@vvcrm.com</div>
              </div>
            </div>

            <div class="info-card">
              <div class="info-icon">
                <span class="material-icons">phone</span>
              </div>
              <div class="info-content">
                <div class="info-label">Телефон</div>
                <div class="info-value">+7 (495) 123-45-67</div>
              </div>
            </div>

            <div class="info-card">
              <div class="info-icon">
                <span class="material-icons">telegram</span>
              </div>
              <div class="info-content">
                <div class="info-label">Telegram</div>
                <div class="info-value">@vvcrm_support</div>
              </div>
            </div>

            <div class="info-card">
              <div class="info-icon">
                <span class="material-icons">schedule</span>
              </div>
              <div class="info-content">
                <div class="info-label">Режим работы</div>
                <div class="info-value">Пн-Пт: 9:00-18:00</div>
              </div>
            </div>
          </div>

          <div class="benefits-list">
            <div class="benefit-item">
              <span class="material-icons">check_circle</span>
              Бесплатная 14-дневная пробная версия
            </div>
            <div class="benefit-item">
              <span class="material-icons">check_circle</span>
              Без привязки кредитной карты
            </div>
            <div class="benefit-item">
              <span class="material-icons">check_circle</span>
              Персональная демонстрация
            </div>
          </div>
        </div>

        <div class="contact-form-wrapper">
          <form class="contact-form" @submit="submitForm">
            <div class="form-group">
              <label for="name">Имя *</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                placeholder="Ваше имя"
                required
              />
            </div>

            <div class="form-group">
              <label for="email">Email *</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="example@company.com"
                required
              />
            </div>

            <div class="form-group">
              <label for="phone">Телефон</label>
              <input
                id="phone"
                v-model="form.phone"
                type="tel"
                placeholder="+7 (___) ___-__-__"
              />
            </div>

            <div class="form-group">
              <label for="company">Компания</label>
              <input
                id="company"
                v-model="form.company"
                type="text"
                placeholder="Название компании"
              />
            </div>

            <div class="form-group full-width">
              <label for="message">Сообщение</label>
              <textarea
                id="message"
                v-model="form.message"
                rows="4"
                placeholder="Расскажите о ваших задачах и потребностях..."
              ></textarea>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="submit-btn"
                :disabled="formState.submitting"
              >
                <span v-if="!formState.submitting">Отправить заявку</span>
                <span v-else>Отправка...</span>
                <span v-if="!formState.submitting" class="material-icons"
                  >send</span
                >
              </button>
            </div>

            <transition name="fade">
              <div v-if="formState.error" class="form-message error">
                {{ formState.error }}
              </div>
            </transition>

            <transition name="fade">
              <div v-if="formState.success" class="form-message success">
                <span class="material-icons">check_circle</span>
                Спасибо! Мы свяжемся с вами в ближайшее время.
              </div>
            </transition>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.contact {
  padding: 100px 0;
  background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -200px;
    right: -200px;
    width: 600px;
    height: 600px;
    background: radial-gradient(
      circle,
      rgba(6, 182, 212, 0.1) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    position: relative;
    z-index: 1;
  }

  .contact-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: start;
  }

  .contact-info {
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
      transform: translateX(-20px);
      transition: all 0.6s ease;
    }

    .section-title {
      font-size: 42px;
      font-weight: 800;
      line-height: 1.2;
      color: #0f172a;
      margin: 0 0 16px;
      opacity: 0;
      transform: translateX(-20px);
      transition: all 0.6s ease 0.1s;
    }

    .section-description {
      font-size: 18px;
      line-height: 1.6;
      color: #64748b;
      margin: 0 0 40px;
      opacity: 0;
      transform: translateX(-20px);
      transition: all 0.6s ease 0.2s;
    }

    .info-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 32px;
      opacity: 0;
      transform: translateX(-20px);
      transition: all 0.6s ease 0.3s;

      .info-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: #fff;
        border-radius: 12px;
        border: 1px solid #e2e8f0;

        .info-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4285f4, #1967d2);
          border-radius: 12px;
          flex-shrink: 0;

          .material-icons {
            font-size: 24px;
            color: #fff;
          }
        }

        .info-content {
          .info-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 2px;
          }

          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
          }
        }
      }
    }

    .benefits-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      opacity: 0;
      transform: translateX(-20px);
      transition: all 0.6s ease 0.4s;

      .benefit-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 15px;
        color: #475569;

        .material-icons {
          flex-shrink: 0;
          font-size: 20px;
          color: #10b981;
        }
      }
    }
  }

  &.visible {
    .section-badge,
    .section-title,
    .section-description,
    .info-cards,
    .benefits-list,
    .contact-form-wrapper {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .contact-form-wrapper {
    background: #fff;
    padding: 40px;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.6s ease 0.3s;

    .contact-form {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &.full-width {
          grid-column: 1 / -1;
        }

        label {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }

        input,
        textarea {
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.3s ease;

        &:focus {
          outline: none;
          border-color: #4285f4;
          box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.1);
        }          &::placeholder {
            color: #cbd5e1;
          }
        }

        textarea {
          resize: vertical;
          min-height: 100px;
        }
      }

      .form-actions {
        grid-column: 1 / -1;
        margin-top: 8px;

        .submit-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 32px;
          background: linear-gradient(135deg, #4285f4 0%, #1967d2 100%);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(66, 133, 244, 0.4);

          .material-icons {
            font-size: 20px;
          }

          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #1967d2 0%, #1557b0 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(66, 133, 244, 0.5);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      .form-message {
        grid-column: 1 / -1;
        padding: 16px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;

        .material-icons {
          font-size: 20px;
        }

        &.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        &.success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
      }
    }
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
}

@media (max-width: 1024px) {
  .contact {
    .contact-wrapper {
      grid-template-columns: 1fr;
      gap: 48px;
    }

    .contact-info {
      .info-cards {
        grid-template-columns: 1fr;
      }
    }
  }
}

@media (max-width: 768px) {
  .contact {
    padding: 80px 0;

    .contact-info {
      .section-title {
        font-size: 32px;
      }

      .section-description {
        font-size: 16px;
      }
    }

    .contact-form-wrapper {
      padding: 28px 20px;

      .contact-form {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>
