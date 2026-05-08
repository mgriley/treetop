<template>
  <main>
    <RouterLink to="/" class="back">← All apps</RouterLink>
    <h1>Admin</h1>

    <section class="log-section">
      <h2>Treetop server</h2>
      <LogPanel log-url="/api/system/logs/treetop" />
    </section>

    <section class="log-section">
      <h2>Traefik</h2>
      <LogPanel log-url="/api/system/logs/traefik" />
    </section>
  </main>
</template>

<script setup lang="ts">
import LogPanel from './LogPanel.vue';
</script>

<style scoped>
main {
  max-width: 720px;
  margin: 60px auto;
  padding: 0 24px;
  font-family: sans-serif;
}

.back {
  font-size: 0.9rem;
  color: #6b7280;
  text-decoration: none;
}

.back:hover {
  text-decoration: underline;
}

h1 {
  font-size: 1.5rem;
  margin: 24px 0 32px;
}

.log-section {
  margin-bottom: 40px;
}

h2 {
  font-size: 1rem;
  margin-bottom: 12px;
}
</style>
