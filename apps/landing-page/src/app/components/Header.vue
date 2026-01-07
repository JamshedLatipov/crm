<script setup lang="ts">
import { ref } from 'vue';

const showMenu = ref(false);

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function closeMenu() {
  showMenu.value = false;
}
</script>

<template>
  <header class="header">
    <div class="container">
      <a class="logo" href="#" @click="closeMenu">
        <svg
          class="logo-icon"
          width="40"
          height="40"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="#4285f4" />
              <stop offset="1" stop-color="#1967d2" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="url(#logoGrad)" />
          <text
            x="50%"
            y="54%"
            text-anchor="middle"
            font-size="14"
            fill="#fff"
            font-weight="700"
            dominant-baseline="middle"
          >
            VV
          </text>
        </svg>
        <div class="logo-text">
          <span class="logo-title">CRM</span>
          <span class="logo-subtitle">Smart Sales Platform</span>
        </div>
      </a>

      <nav class="nav">
        <button
          class="menu-toggle"
          :aria-expanded="showMenu"
          @click="toggleMenu"
        >
          <span class="sr-only">Toggle menu</span>
          <span class="hamburger" :class="{ active: showMenu }"></span>
        </button>

        <ul :class="['nav-list', { open: showMenu }]" @click="closeMenu">
          <li><a href="#features">Возможности</a></li>
          <li><a href="#benefits">Преимущества</a></li>
          <li><a href="#screenshots">Галерея</a></li>
          <li><a href="#pricing">Тарифы</a></li>
          <li><a href="#contact" class="nav-cta">Демо версия</a></li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 72px;
  }
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.02);
  }

  .logo-icon {
    flex-shrink: 0;
  }

  .logo-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .logo-title {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
  }

  .logo-subtitle {
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
}

.nav {
  display: flex;
  align-items: center;
}

.menu-toggle {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  z-index: 101;

  .hamburger {
    display: block;
    width: 24px;
    height: 2px;
    background: #0f172a;
    position: relative;
    transition: all 0.3s ease;

    &::before,
    &::after {
      content: '';
      position: absolute;
      width: 24px;
      height: 2px;
      background: #0f172a;
      transition: all 0.3s ease;
    }

    &::before {
      top: -7px;
    }

    &::after {
      top: 7px;
    }

    &.active {
      background: transparent;

      &::before {
        top: 0;
        transform: rotate(45deg);
      }

      &::after {
        top: 0;
        transform: rotate(-45deg);
      }
    }
  }
}

.nav-list {
  display: flex;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  align-items: center;

  a {
    display: inline-block;
    padding: 10px 18px;
    color: #334155;
    text-decoration: none;
    font-weight: 500;
    font-size: 15px;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    &.nav-cta {
      background: linear-gradient(135deg, #4285f4 0%, #1967d2 100%);
      color: #fff;
      margin-left: 8px;
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);

      &:hover {
        background: linear-gradient(135deg, #1967d2 0%, #1557b0 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
      }
    }
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@media (max-width: 768px) {
  .header .container {
    min-height: 64px;
  }

  .logo-text {
    display: none !important;
  }

  .menu-toggle {
    display: block;
  }

  .nav-list {
    display: none;

    &.open {
      display: flex;
      position: fixed;
      top: 64px;
      left: 0;
      right: 0;
      flex-direction: column;
      background: #fff;
      padding: 24px;
      gap: 4px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      animation: slideDown 0.3s ease;

      a {
        width: 100%;
        text-align: center;
        padding: 14px;
        font-size: 16px;
      }
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
