<script setup lang="ts">
import { ref } from 'vue';

const showMenu = ref(false);
const form = ref({ name: '', email: '', company: '', message: '' });
const formState = ref({ submitting: false, success: false, error: '' });
// screenshots added by user — load via import.meta URL so Vite bundles them
const screenshots = [
  new URL('../assets/Снимок экрана 2025-12-03 в 21.19.20.png', import.meta.url)
    .href,
  new URL('../assets/Снимок экрана 2025-12-03 в 21.19.35.png', import.meta.url)
    .href,
  new URL('../assets/Снимок экрана 2025-12-03 в 21.19.53.png', import.meta.url)
    .href,
  new URL('../assets/Снимок экрана 2025-12-03 в 21.20.22.png', import.meta.url)
    .href,
  new URL('../assets/Снимок экрана 2025-12-03 в 21.20.44.png', import.meta.url)
    .href,
];
const descriptions = [
  'Элегантный дашборд CRM с обзором ключевых метрик и активных сделок',
  'Интерфейс управления контактами с возможностью быстрого поиска и фильтрации',
  'Визуализация pipeline сделок с drag-and-drop функциональностью',
  'Интегрированная телефонная панель с JsSIP softphone',
  'Система управления задачами с автоматическим расчетом дедлайнов',
];
const current = ref(0);
let autoplayTimer: ReturnType<typeof setInterval> | null = null;
let touchStartX = 0;

function prev() {
  current.value = (current.value - 1 + screenshots.length) % screenshots.length;
}

function next() {
  current.value = (current.value + 1) % screenshots.length;
}

function selectIndex(i: number) {
  current.value = i;
}

function startAutoplay() {
  stopAutoplay();
  autoplayTimer = setInterval(() => {
    next();
  }, 3500);
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') prev();
  if (e.key === 'ArrowRight') next();
}

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0]?.clientX || 0;
}

function onTouchEnd(e: TouchEvent) {
  const endX = e.changedTouches[0]?.clientX || 0;
  const dx = endX - touchStartX;
  if (Math.abs(dx) > 40) {
    if (dx < 0) next();
    else prev();
  }
}

// start autoplay when component mounted
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKey);
  startAutoplay();
}

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

async function submitForm(e: Event) {
  e.preventDefault();
  formState.value.error = '';
  formState.value.success = false;
  if (!form.value.name || !form.value.email) {
    formState.value.error = 'Please provide your name and email.';
    return;
  }
  if (!validateEmail(form.value.email)) {
    formState.value.error = 'Please enter a valid email.';
    return;
  }
  formState.value.submitting = true;
  try {
    // Placeholder: in future wire to real API endpoint
    await new Promise((r) => setTimeout(r, 800));
    formState.value.success = true;
    form.value.name = '';
    form.value.email = '';
    form.value.company = '';
    form.value.message = '';
  } catch (err: any) {
    formState.value.error = 'Submission failed. Please try again later.';
  } finally {
    formState.value.submitting = false;
  }
}
</script>

<template>
  <div class="lp-root">
    <header class="lp-header">
      <div class="lp-container header-inner">
        <a class="brand" href="#">
          <svg
            class="logo"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stop-color="#06b6d4" />
                <stop offset="1" stop-color="#0ea5a4" />
              </linearGradient>
            </defs>
            <rect width="24" height="24" rx="6" fill="url(#g1)" />
            <text
              x="50%"
              y="53%"
              text-anchor="middle"
              font-size="11"
              fill="#042a2b"
              font-weight="700"
            >
              CRM
            </text>
          </svg>
          <div class="brand-text">
            <div class="name">CRM</div>
            <div class="tag">Sales & Support Platform</div>
          </div>
        </a>

        <nav class="nav">
          <button
            class="nav-toggle"
            :aria-expanded="showMenu"
            @click="toggleMenu"
          >
            <span class="sr-only">Toggle navigation</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <ul
            :class="['nav-list', { open: showMenu }]"
            @click="showMenu = false"
          >
            <li><a href="#features">Features</a></li>
            <li><a href="#pipeline">Pipeline</a></li>
            <li><a href="#ivr">IVR</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li>
              <a class="cta" href="#contact">Get a demo</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="lp-container hero-inner">
          <div class="hero-left">
            <h1>CRM that moves deals faster — with calls built in</h1>
            <p class="lead">
              Manage leads, automate assignment, run IVR call flows and let
              agents work from one unified interface. Self-host or cloud —
              production-ready telephony included.
            </p>
            <div class="hero-actions">
              <a href="#contact" class="btn-primary">Request a demo</a>
              <a href="#features" class="btn-ghost">See features</a>
            </div>
            <ul class="value-list">
              <li>Round-robin & smart assignment</li>
              <li>JsSIP softphone + Asterisk</li>
              <li>Deadline visuals & SLAs</li>
            </ul>
          </div>

          <div class="hero-right">
            <div class="mockup carousel">
              <div class="carousel-inner">
                <button
                  class="carousel-btn prev"
                  aria-label="Previous screenshot"
                  @click.prevent="prev"
                >
                  ‹
                </button>

                <div class="carousel-frame">
                  <img
                    :src="screenshots[current]"
                    :alt="descriptions[current] || 'App screenshot'"
                    class="hero-image"
                    loading="lazy"
                  />
                </div>

                <button
                  class="carousel-btn next"
                  aria-label="Next screenshot"
                  @click.prevent="next"
                >
                  ›
                </button>
              </div>

              <div class="thumbs">
                <template v-for="(s, i) in screenshots" :key="i">
                  <img
                    class="thumb"
                    :class="{ active: i === current }"
                    :src="s"
                    :alt="descriptions[i] || `Screenshot ${i + 1}`"
                    loading="lazy"
                    @click="selectIndex(i)"
                  />
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="features">
        <div class="lp-container">
          <h2>Everything teams need to close and support customers</h2>
          <div class="features-grid">
            <div class="feature-card">
              <h3>Contacts & Companies</h3>
              <p>
                Centralized contact model, dedupe, custom fields and full
                linkability between contacts, companies and deals.
              </p>
            </div>
            <div class="feature-card">
              <h3>Leads & Assignment</h3>
              <p>
                Flexible rules, round-robin, source tracking and quick
                convert-to-deal flows for SDR and sales teams.
              </p>
            </div>
            <div class="feature-card">
              <h3>Deals & Pipeline</h3>
              <p>
                Drag-and-drop pipeline, probability & forecasting, full deal
                history and activity timeline.
              </p>
            </div>
            <div class="feature-card">
              <h3>Telephony & IVR</h3>
              <p>
                JsSIP WebRTC softphone, dynamic IVR trees, queues and call
                recordings — integrate with Asterisk.
              </p>
            </div>
            <div class="feature-card">
              <h3>Tasks & Deadlines</h3>
              <p>
                Auto-calculated deadlines, SLA warnings and visual timelines so
                nothing slips through the cracks.
              </p>
            </div>
            <div class="feature-card">
              <h3>Notifications & Rules</h3>
              <p>
                In-app notifications, email rules and webhooks to connect your
                stack.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" class="pricing">
        <div class="lp-container">
          <h2>Pricing that fits your deployment</h2>
          <p class="muted">
            Self-host or cloud-ready. Start with a demo to assess needs and
            scaling.
          </p>
          <div class="pricing-grid">
            <div class="price-card">
              <h3>Starter</h3>
              <div class="price">Free</div>
              <ul>
                <li>Basic CRM</li>
                <li>Up to 5 users</li>
              </ul>
              <a class="btn-outline" href="#contact">Get started</a>
            </div>
            <div class="price-card highlight">
              <h3>Business</h3>
              <div class="price">Contact us</div>
              <ul>
                <li>Unlimited users</li>
                <li>IVR & Softphone</li>
                <li>Priority support</li>
              </ul>
              <a class="btn-primary" href="#contact">Request demo</a>
            </div>
            <div class="price-card">
              <h3>Enterprise</h3>
              <div class="price">Custom</div>
              <ul>
                <li>On-prem / Cloud</li>
                <li>Custom integrations</li>
              </ul>
              <a class="btn-outline" href="#contact">Contact sales</a>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" class="contact">
        <div class="lp-container">
          <h2>Request a demo</h2>
          <p class="muted">
            Tell us about your team and we'll reach out to schedule a
            personalized walkthrough.
          </p>

          <form class="contact-form" @submit="submitForm">
            <div class="row">
              <input
                v-model="form.name"
                type="text"
                placeholder="Your name"
                aria-label="name"
                required
              />
              <input
                v-model="form.email"
                type="email"
                placeholder="Email"
                aria-label="email"
                required
              />
            </div>
            <input
              v-model="form.company"
              type="text"
              placeholder="Company"
              aria-label="company"
            />
            <textarea
              v-model="form.message"
              placeholder="Short message"
              rows="4"
            ></textarea>

            <div class="form-actions">
              <button class="btn-primary" :disabled="formState.submitting">
                {{ formState.submitting ? 'Sending...' : 'Send request' }}
              </button>
              <button
                class="btn-ghost"
                type="reset"
                @click.prevent="
                  form.name = '';
                  form.email = '';
                  form.company = '';
                  form.message = '';
                "
              >
                Reset
              </button>
            </div>

            <div class="form-feedback">
              <div v-if="formState.error" class="error">
                {{ formState.error }}
              </div>
              <div v-if="formState.success" class="success">
                Thanks — we will contact you soon.
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>

    <footer class="lp-footer">
      <div class="lp-container footer-inner">
        <div>© <strong>CRM</strong> — Built for teams.</div>
        <div class="links"><a href="#">Privacy</a> · <a href="#">Terms</a></div>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
/* Design tokens */
:root {
  --max-w: 1200px;
  --bg: #ffffff;
  --bg-secondary: #f8fafc;
  --accent: #06b6d4;
  --accent-2: #0ea5a4;
  --accent-hover: #0891b2;
  --muted: #6b7280;
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --card: #ffffff;
  --shadow: rgba(0, 0, 0, 0.05);
  --shadow-strong: rgba(0, 0, 0, 0.1);
  --border: #e2e8f0;
  --success: #10b981;
  --error: #ef4444;
}

.lp-container {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 28px;
}
* {
  box-sizing: border-box;
}
body,
html {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
    Roboto, 'Helvetica Neue', Arial;
}

.lp-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: #fff;
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 3px var(--shadow);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}
.brand .logo {
  flex-shrink: 0;
}
.brand-text .name {
  font-weight: 700;
  color: var(--text-primary);
}
.brand-text .tag {
  font-size: 12px;
  color: var(--muted);
}

.nav {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-toggle {
  display: none;
  background: transparent;
  border: 0;
  padding: 6px;
}
.nav-list {
  display: flex;
  gap: 16px;
  list-style: none;
  margin: 0;
  padding: 0;
  align-items: center;
}
.nav-list a {
  color: var(--text-primary);
  text-decoration: none;
  padding: 8px 10px;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.nav-list a:hover {
  background: #f1f5f9;
}
.nav-list a.cta {
  background: var(--accent);
  color: #fff;
}
.nav-list a.cta:hover {
  background: var(--accent-hover);
}

.hero {
  padding: 80px 0;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  color: #fff;
  border-bottom: 1px solid var(--border);
}
.hero-inner {
  display: flex;
  gap: 48px;
  align-items: center;
}
.hero-left {
  flex: 1;
}
.hero-left h1 {
  font-size: 48px;
  line-height: 1.1;
  margin: 0 0 16px;
  font-weight: 700;
}
.lead {
  opacity: 0.9;
  margin: 0 0 24px;
  font-size: 18px;
  color: #fff;
}
.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.btn-primary {
  display: inline-block;
  background: #fff;
  color: var(--accent-2);
  padding: 14px 24px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  border: 2px solid #fff;
  transition: all 0.3s ease;
}
.btn-primary:hover {
  background: var(--accent-2);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}
.btn-ghost {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.8);
  color: #fff;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #fff;
}
.value-list {
  list-style: none;
  padding: 0;
  margin: 20px 0;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.value-list li {
  background: rgba(255, 255, 255, 0.15);
  padding: 10px 16px;
  border-radius: 20px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hero-right {
  width: 100%;
}
.mockup {
  background: #fff;
  color: var(--text-primary);
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 20px 40px var(--shadow-strong);
  border: 1px solid var(--border);
}
.mockup-top {
  font-weight: 700;
  padding-bottom: 12px;
  font-size: 16px;
}
.mockup-grid {
  display: flex;
  gap: 12px;
}
.mockup .col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mockup .card {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 12px;
  min-width: 160px;
  text-align: center;
  border: 1px solid var(--border);
}
.mockup .card.muted {
  opacity: 0.6;
}

/* Carousel / screenshots */
.carousel {
  padding: 12px;
}
.carousel-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}
.carousel-frame {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  max-width: 400px;
  margin: 0 auto;
}
.hero-image {
  max-width: 100%;
  height: auto;
  max-height: 320px;
  border-radius: 8px;
  object-fit: cover;
  display: block;
  transition: opacity 0.3s ease;
}
.carousel-btn {
  background: transparent;
  border: 1px solid var(--shadow);
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.carousel-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.thumbs {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  overflow: auto;
  padding-bottom: 4px;
}
.thumb {
  width: 100px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0.8;
  border: 3px solid transparent;
  transition: all 0.2s ease;
}
.thumb.active {
  opacity: 1;
  border-color: var(--accent-2);
  transform: scale(1.05);
}
.thumb:hover {
  opacity: 1;
  transform: scale(1.02);
}

@media (max-width: 960px) {
  .carousel-frame {
    min-height: 180px;
  }
  .hero-image {
    max-height: 240px;
  }
  .thumb {
    width: 64px;
    height: 44px;
  }
}

.features {
  padding: 80px 0;
  background: var(--bg-secondary);
}
.features h2 {
  text-align: center;
  margin-bottom: 16px;
  font-size: 36px;
  color: var(--text-primary);
}
.features .muted {
  text-align: center;
  margin-bottom: 40px;
  color: var(--text-secondary);
  font-size: 18px;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 40px;
}
.feature-card {
  background: #fff;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px var(--shadow);
  border: 1px solid var(--border);
  transition: all 0.3s ease;
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px var(--shadow-strong);
}
.feature-card h3 {
  margin: 0 0 12px;
  font-size: 20px;
  color: var(--text-primary);
}
.feature-card p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.pricing {
  padding: 80px 0;
  background: #fff;
}
.pricing h2 {
  text-align: center;
  margin-bottom: 16px;
  font-size: 36px;
  color: var(--text-primary);
}
.pricing .muted {
  text-align: center;
  margin-bottom: 40px;
  color: var(--text-secondary);
  font-size: 18px;
}
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}
.price-card {
  background: #fff;
  padding: 32px;
  border-radius: 16px;
  border: 2px solid var(--border);
  flex: 1;
  transition: all 0.3s ease;
}
.price-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--shadow-strong);
}
.price-card.highlight {
  border-color: var(--accent);
  box-shadow: 0 8px 20px rgba(6, 182, 212, 0.2);
}
.price-card h3 {
  margin: 0 0 8px;
  font-size: 24px;
  color: var(--text-primary);
}
.price {
  font-size: 32px;
  font-weight: 700;
  margin: 8px 0;
  color: var(--accent-2);
}
.price-card ul {
  list-style: none;
  padding: 0;
  margin: 16px 0;
  text-align: left;
}
.price-card li {
  margin: 8px 0;
  color: var(--text-secondary);
}
.price-card a {
  margin-top: 20px;
}

.contact {
  padding: 80px 0;
  background: var(--bg-secondary);
}
.contact h2 {
  text-align: center;
  margin-bottom: 16px;
  font-size: 36px;
  color: var(--text-primary);
}
.contact .muted {
  text-align: center;
  margin-bottom: 40px;
  color: var(--text-secondary);
  font-size: 18px;
}
.contact-form {
  display: grid;
  gap: 16px;
  max-width: 600px;
  margin: 0 auto;
}
.contact-form .row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.contact-form input,
.contact-form textarea {
  padding: 16px;
  border-radius: 12px;
  border: 2px solid var(--border);
  font-size: 16px;
  transition: border-color 0.3s ease;
}
.contact-form input:focus,
.contact-form textarea:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
}
.form-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}
.btn-primary {
  background: var(--accent);
  color: #fff;
  border: 2px solid var(--accent);
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-ghost {
  background: #fff;
  border: 2px solid var(--border);
  color: var(--text-primary);
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-ghost:hover {
  background: var(--bg-secondary);
  border-color: var(--text-secondary);
}
.form-feedback .error {
  color: var(--error);
  margin-top: 12px;
  font-weight: 500;
}
.form-feedback .success {
  color: var(--success);
  margin-top: 12px;
  font-weight: 500;
}

.lp-footer {
  background: #fff;
  color: var(--text-secondary);
  padding: 32px 0;
  border-top: 1px solid var(--border);
}
.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-inner a {
  color: var(--accent);
  text-decoration: none;
}
.footer-inner a:hover {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .hero-inner {
    flex-direction: column;
    text-align: center;
  }
  .hero-right {
    width: 90%;
    max-width: 400px;
    margin: 40px auto 0;
  }
  .hero-left h1 {
    font-size: 36px;
  }
  .hero-actions {
    justify-content: center;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
  .pricing-grid {
    grid-template-columns: 1fr;
  }
  .contact-form .row {
    grid-template-columns: 1fr;
  }
  .carousel-frame {
    min-height: 180px;
    max-width: 350px;
  }
  .hero-image {
    max-height: 250px;
  }
  .thumb {
    width: 70px;
    height: 48px;
  }
  .nav-list {
    display: none;
  }
  .nav-toggle {
    display: block;
  }
  .nav-list.open {
    display: flex;
    position: absolute;
    top: 60px;
    right: 20px;
    background: #fff;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 10px 30px var(--shadow-strong);
    flex-direction: column;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .lp-container {
    padding: 20px;
  }
}
</style>
