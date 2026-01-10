<script setup lang="ts">
import Header from './components/Header.vue';
import Hero from './components/Hero.vue';
import Features from './components/Features.vue';
import Benefits from './components/Benefits.vue';
import Screenshots from './components/Screenshots.vue';
import Pricing from './components/Pricing.vue';
import Contact from './components/Contact.vue';
import Footer from './components/Footer.vue';
</script>

<template>
  <div class="app">
    <Header />
    <main>
      <Hero />
      <Features />
      <Benefits />
      <Screenshots />
      <Pricing />
      <Contact />
    </main>
    <Footer />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}
</style>
