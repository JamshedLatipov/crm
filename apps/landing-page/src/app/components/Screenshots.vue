<script setup lang="ts">
import { ref, onMounted } from 'vue';

const screenshots = [
  {
    url: new URL(
      '../../assets/Снимок экрана 2025-12-03 в 21.19.20.png',
      import.meta.url
    ).href,
    title: 'Главный дашборд',
    description: 'Обзор ключевых метрик и активных сделок',
  },
  {
    url: new URL(
      '../../assets/Снимок экрана 2025-12-03 в 21.19.35.png',
      import.meta.url
    ).href,
    title: 'Управление контактами',
    description: 'Централизованная база с историей взаимодействий',
  },
  {
    url: new URL(
      '../../assets/Снимок экрана 2025-12-03 в 21.19.53.png',
      import.meta.url
    ).href,
    title: 'Воронка продаж',
    description: 'Визуализация pipeline с drag-and-drop',
  },
  {
    url: new URL(
      '../../assets/Снимок экрана 2025-12-03 в 21.20.22.png',
      import.meta.url
    ).href,
    title: 'IP-телефония',
    description: 'Встроенный softphone с очередями звонков',
  },
  {
    url: new URL(
      '../../assets/Снимок экрана 2025-12-03 в 21.20.44.png',
      import.meta.url
    ).href,
    title: 'Аналитика',
    description: 'Детальные отчеты и прогнозирование',
  },
];

const current = ref(0);
const isVisible = ref(false);

function selectImage(index: number) {
  current.value = index;
}

function prev() {
  current.value = (current.value - 1 + screenshots.length) % screenshots.length;
}

function next() {
  current.value = (current.value + 1) % screenshots.length;
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

  const section = document.querySelector('#screenshots');
  if (section) {
    observer.observe(section);
  }

  // Auto-rotate
  const interval = setInterval(() => {
    next();
  }, 5000);

  return () => clearInterval(interval);
});
</script>

<template>
  <section id="screenshots" class="screenshots" :class="{ visible: isVisible }">
    <div class="container">
      <div class="section-header">
        <span class="section-badge">Галерея</span>
        <h2 class="section-title">Взгляните на интерфейс</h2>
        <p class="section-description">
          Современный и интуитивный дизайн, созданный для максимальной
          продуктивности
        </p>
      </div>

      <div class="gallery">
        <div class="main-display">
          <button class="nav-btn prev" @click="prev" aria-label="Предыдущий">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div class="display-wrapper">
            <transition name="fade" mode="out-in">
              <img
                :key="current"
                :src="screenshots[current]?.url || ''"
                :alt="screenshots[current]?.title || ''"
                class="main-image"
                loading="lazy"
              />
            </transition>
            <div class="image-info">
              <h3>{{ screenshots[current]?.title }}</h3>
              <p>{{ screenshots[current]?.description }}</p>
            </div>
          </div>

          <button class="nav-btn next" @click="next" aria-label="Следующий">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div class="thumbnails">
          <button
            v-for="(screenshot, index) in screenshots"
            :key="index"
            :class="['thumbnail', { active: index === current }]"
            @click="selectImage(index)"
          >
            <img :src="screenshot.url" :alt="screenshot.title" loading="lazy" />
            <div class="thumbnail-overlay">
              <span>{{ screenshot.title }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.screenshots {
  padding: 100px 0;
  background: #fff;
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
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
      color: #db2777;
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

    .gallery {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .gallery {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s ease 0.3s;
  }

  .main-display {
    position: relative;
    margin-bottom: 32px;
    background: #f8fafc;
    border-radius: 24px;
    padding: 24px;
    border: 2px solid #e2e8f0;

    .display-wrapper {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      aspect-ratio: 16 / 10;

      .main-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .image-info {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 24px;
        background: linear-gradient(
          to top,
          rgba(0, 0, 0, 0.8) 0%,
          transparent 100%
        );
        color: #fff;

        h3 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 4px;
        }

        p {
          font-size: 14px;
          margin: 0;
          opacity: 0.9;
        }
      }
    }

    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      background: #fff;
      border: 2px solid #e2e8f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 10;

      svg {
        stroke-width: 2.5;
      }

      &:hover {
        background: #4285f4;
        border-color: #4285f4;
        color: #fff;
        transform: translateY(-50%) scale(1.1);
      }

      &.prev {
        left: -24px;
      }

      &.next {
        right: -24px;
      }
    }
  }

  .thumbnails {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;

    .thumbnail {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      border: 3px solid transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      background: none;
      padding: 0;
      aspect-ratio: 16 / 10;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.3s ease;
      }

      .thumbnail-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to top,
          rgba(0, 0, 0, 0.7) 0%,
          transparent 100%
        );
        display: flex;
        align-items: flex-end;
        padding: 12px;
        opacity: 0;
        transition: opacity 0.3s ease;

        span {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
        }
      }

      &:hover {
        .thumbnail-overlay {
          opacity: 1;
        }

        img {
          transform: scale(1.05);
        }
      }

      &.active {
        border-color: #4285f4;
        box-shadow: 0 4px 20px rgba(66, 133, 244, 0.3);

        .thumbnail-overlay {
          opacity: 1;
          background: linear-gradient(
            to top,
            rgba(66, 133, 244, 0.8) 0%,
            transparent 100%
          );
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

@media (max-width: 768px) {
  .screenshots {
    padding: 80px 0;

    .section-header {
      margin-bottom: 48px;

      .section-title {
        font-size: 36px;
      }
    }

    .main-display {
      .nav-btn {
        width: 40px;
        height: 40px;

        &.prev {
          left: -12px;
        }

        &.next {
          right: -12px;
        }
      }

      .display-wrapper {
        .image-info {
          padding: 16px;

          h3 {
            font-size: 18px;
          }

          p {
            font-size: 13px;
          }
        }
      }
    }

    .thumbnails {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
  }
}
</style>
