<template>
  <main>
    <h1>Treetop</h1>

    <section class="install">
      <form @submit.prevent="install">
        <input
          v-model="installUrl"
          type="url"
          placeholder="Paste app URL to install..."
          :disabled="installing"
        />
        <button type="submit" :disabled="installing || !installUrl">
          {{ installing ? 'Installing...' : 'Install' }}
        </button>
      </form>
      <p v-if="installError" class="error">{{ installError }}</p>
    </section>

    <section class="apps">
      <p v-if="loading">Loading apps...</p>
      <p v-else-if="apps.length === 0">No apps installed yet.</p>
      <ul v-else>
        <li v-for="app in apps" :key="app.id">
          <div class="app-info">
            <span class="app-url">{{ app.installUrl }}</span>
            <span :class="['status', app.status]">{{ app.status }}</span>
          </div>
          <a :href="app.url" target="_blank">{{ app.url }}</a>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { listApps, installApp, type App } from './api';

const apps = ref<App[]>([]);
const loading = ref(true);
const installUrl = ref('');
const installing = ref(false);
const installError = ref('');

async function fetchApps() {
  loading.value = true;
  apps.value = await listApps();
  loading.value = false;
}

async function install() {
  installError.value = '';
  installing.value = true;
  try {
    await installApp(installUrl.value);
    installUrl.value = '';
    await fetchApps();
  } catch (err) {
    installError.value = err instanceof Error ? err.message : 'Something went wrong';
  } finally {
    installing.value = false;
  }
}

onMounted(fetchApps);
</script>

<style scoped>
main {
  max-width: 720px;
  margin: 60px auto;
  padding: 0 24px;
  font-family: sans-serif;
}

h1 {
  font-size: 2rem;
  margin-bottom: 32px;
}

.install form {
  display: flex;
  gap: 8px;
}

.install input {
  flex: 1;
  padding: 10px 14px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.install button {
  padding: 10px 20px;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}

.install button:disabled {
  opacity: 0.5;
  cursor: default;
}

.error {
  margin-top: 8px;
  color: #ef4444;
  font-size: 0.9rem;
}

.apps {
  margin-top: 48px;
}

.apps ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.apps li {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-url {
  font-weight: 500;
}

.status {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 99px;
  background: #e5e7eb;
  color: #6b7280;
}

.status.running {
  background: #dcfce7;
  color: #16a34a;
}

.apps a {
  font-size: 0.9rem;
  color: #6b7280;
  text-decoration: none;
}

.apps a:hover {
  text-decoration: underline;
}
</style>
