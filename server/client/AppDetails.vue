<template>
  <main>
    <RouterLink to="/" class="back">← All apps</RouterLink>

    <div v-if="loading" class="state">Loading...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <template v-else-if="app">
      <div class="header">
        <div>
          <h1>{{ app.name }}</h1>
          <a :href="app.url" target="_blank" class="app-url">{{ app.url }}</a>
        </div>
        <span :class="['status', app.status]">{{ app.status }}</span>
      </div>

      <div class="actions">
        <button v-if="app.status === 'running'" class="btn-stop" :disabled="!!pending" @click="stop">Stop</button>
        <button v-else class="btn-start" :disabled="!!pending" @click="start">Start</button>
        <button class="btn-restart" :disabled="!!pending" @click="restart">Restart</button>
        <button class="btn-soft-restart" :disabled="!!pending" @click="softRestart">Soft restart</button>
        <button class="btn-delete" :disabled="!!pending" @click="remove">Delete</button>
      </div>

      <section class="admin">
        <h2>Admin</h2>

        <div class="admin-block">
          <h3>Agent</h3>
          <AgentChat :app-id="app.id" />
        </div>

        <div class="admin-block">
          <h3>Logs</h3>
          <LogPanel :log-url="`/api/apps/${app.id}/logs`" />
        </div>

        <div class="admin-block">
          <h3>Rename</h3>
          <form class="rename-form" @submit.prevent="rename">
            <input
              v-model="newName"
              type="text"
              spellcheck="false"
              :placeholder="app.name"
            />
            <button type="submit" :disabled="!canRename">Save</button>
          </form>
          <p v-if="renameError" class="rename-error">{{ renameError }}</p>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAppByName, startApp, stopApp, restartApp, softRestartApp, deleteApp, renameApp, type App } from './api';
import LogPanel from './LogPanel.vue';
import AgentChat from './AgentChat.vue';

const route = useRoute();
const router = useRouter();
const name = route.params.name as string;

const app = ref<App | null>(null);
const loading = ref(true);
const error = ref('');
const pending = ref(false);
const newName = ref('');
const renameError = ref('');

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const canRename = computed(() =>
  newName.value.length > 0 &&
  newName.value !== app.value?.name &&
  NAME_RE.test(newName.value) &&
  newName.value.length <= 63
);

async function fetchApp() {
  loading.value = true;
  error.value = '';
  try {
    app.value = await getAppByName(name);
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

async function start()   { await withPending(() => startApp(app.value!.id)); }
async function stop()    { await withPending(() => stopApp(app.value!.id)); }
async function restart()      { await withPending(() => restartApp(app.value!.id)); }
async function softRestart() { await withPending(() => softRestartApp(app.value!.id)); }
async function remove() {
  await withPending(() => deleteApp(app.value!.id));
  router.push('/');
}

async function rename() {
  if (!canRename.value || !app.value) return;
  renameError.value = '';
  try {
    const updated = await renameApp(app.value.id, newName.value);
    newName.value = '';
    router.replace(`/apps/${updated.name}`);
    app.value = { ...app.value, ...updated };
  } catch (err) {
    renameError.value = err instanceof Error ? err.message : 'Failed to rename app';
  }
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

.back:hover { text-decoration: underline; }

.state { margin-top: 32px; color: #6b7280; }
.state.error { color: #ef4444; }

.header {
  margin-top: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

h1 { font-size: 1.5rem; margin: 0 0 4px; }

.app-url { font-size: 0.9rem; color: #6b7280; text-decoration: none; }
.app-url:hover { text-decoration: underline; }

.status {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 99px;
  background: #e5e7eb;
  color: #6b7280;
  white-space: nowrap;
  margin-top: 6px;
}

.status.running { background: #dcfce7; color: #16a34a; }

.actions { display: flex; gap: 8px; margin-top: 20px; }

.actions button {
  padding: 6px 16px;
  font-size: 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.actions button:disabled { opacity: 0.4; cursor: default; }

.btn-start   { background: #dcfce7; color: #16a34a; }
.btn-stop    { background: #fef9c3; color: #854d0e; }
.btn-restart      { background: #eff6ff; color: #2563eb; }
.btn-soft-restart { background: #f5f3ff; color: #7c3aed; }
.btn-delete  { background: #fee2e2; color: #dc2626; }

.admin {
  margin-top: 48px;
  border-top: 1px solid #e5e7eb;
  padding-top: 32px;
}

.admin h2 { font-size: 1rem; margin: 0 0 24px; color: #6b7280; }

.admin-block { margin-bottom: 32px; }

.admin-block h3 {
  font-size: 0.9rem;
  margin: 0 0 10px;
  color: #374151;
}

.rename-form {
  display: flex;
  gap: 8px;
}

.rename-form input {
  width: 220px;
  padding: 8px 12px;
  font-size: 0.9rem;
  font-family: monospace;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
}

.rename-form input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

.rename-form button {
  padding: 8px 16px;
  font-size: 0.9rem;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}

.rename-form button:disabled { opacity: 0.4; cursor: default; }

.rename-error { margin-top: 6px; font-size: 0.8rem; color: #ef4444; }
</style>
