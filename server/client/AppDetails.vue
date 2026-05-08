<template>
  <main>
    <RouterLink to="/" class="back">← All apps</RouterLink>

    <div v-if="loading" class="state">Loading...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <template v-else-if="app">
      <div class="header">
        <div>
          <h1>{{ app.installUrl }}</h1>
          <a :href="app.url" target="_blank" class="app-url">{{ app.url }}</a>
        </div>
        <span :class="['status', app.status]">{{ app.status }}</span>
      </div>

      <div class="actions">
        <button v-if="app.status === 'running'" class="btn-stop" :disabled="!!pending" @click="stop">Stop</button>
        <button v-else class="btn-start" :disabled="!!pending" @click="start">Start</button>
        <button class="btn-delete" :disabled="!!pending" @click="remove">Delete</button>
      </div>

      <section class="logs">
        <h2>Logs</h2>
        <LogPanel :log-url="`/api/apps/${app.id}/logs`" />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getApp, startApp, stopApp, deleteApp, type App } from './api';
import LogPanel from './LogPanel.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const app = ref<App | null>(null);
const loading = ref(true);
const error = ref('');
const pending = ref(false);

async function fetchApp() {
  loading.value = true;
  error.value = '';
  try {
    app.value = await getApp(id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load app';
  } finally {
    loading.value = false;
  }
}

async function withPending(fn: () => Promise<void>) {
  pending.value = true;
  try {
    await fn();
    await fetchApp();
  } finally {
    pending.value = false;
  }
}

async function start()  { await withPending(() => startApp(id)); }
async function stop()   { await withPending(() => stopApp(id)); }
async function remove() {
  await withPending(() => deleteApp(id));
  router.push('/');
}

onMounted(fetchApp);
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

.state {
  margin-top: 32px;
  color: #6b7280;
}

.state.error {
  color: #ef4444;
}

.header {
  margin-top: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

h1 {
  font-size: 1.5rem;
  margin: 0 0 4px;
}

.app-url {
  font-size: 0.9rem;
  color: #6b7280;
  text-decoration: none;
}

.app-url:hover {
  text-decoration: underline;
}

.status {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 99px;
  background: #e5e7eb;
  color: #6b7280;
  white-space: nowrap;
  margin-top: 6px;
}

.status.running {
  background: #dcfce7;
  color: #16a34a;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.actions button {
  padding: 6px 16px;
  font-size: 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.actions button:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-start  { background: #dcfce7; color: #16a34a; }
.btn-stop   { background: #fef9c3; color: #854d0e; }
.btn-delete { background: #fee2e2; color: #dc2626; }

.logs {
  margin-top: 40px;
}

h2 {
  font-size: 1rem;
  margin-bottom: 12px;
}
</style>
