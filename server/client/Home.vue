<template>
  <main>
    <div class="title-row">
      <h1>Treetop</h1>
      <RouterLink to="/admin" class="admin-link">Admin</RouterLink>
    </div>

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
            <RouterLink :to="`/apps/${app.id}`" class="app-name">{{ app.installUrl }}</RouterLink>
            <span :class="['status', app.status]">{{ app.status }}</span>
          </div>
          <div class="app-footer">
            <a :href="app.url" target="_blank">{{ app.url }}</a>
            <div class="actions">
              <button
                v-if="app.status === 'running'"
                class="btn-stop"
                :disabled="!!pending[app.id]"
                @click="stop(app.id)"
              >Stop</button>
              <button
                v-else
                class="btn-start"
                :disabled="!!pending[app.id]"
                @click="start(app.id)"
              >Start</button>
              <button
                class="btn-delete"
                :disabled="!!pending[app.id]"
                @click="remove(app.id)"
              >Delete</button>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { listApps, installApp, startApp, stopApp, deleteApp, type App } from './api';

const apps = ref<App[]>([]);
const loading = ref(true);
const installUrl = ref('');
const installing = ref(false);
const installError = ref('');
const pending = ref<Record<string, boolean>>({});

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

async function withPending(id: string, fn: () => Promise<void>) {
  pending.value[id] = true;
  try {
    await fn();
    await fetchApps();
  } finally {
    delete pending.value[id];
  }
}

const start  = (id: string) => withPending(id, () => startApp(id));
const stop   = (id: string) => withPending(id, () => stopApp(id));
const remove = (id: string) => withPending(id, () => deleteApp(id));

onMounted(fetchApps);
</script>

<style scoped>
main {
  max-width: 720px;
  margin: 60px auto;
  padding: 0 24px;
  font-family: sans-serif;
}

.title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 32px;
}

h1 {
  font-size: 2rem;
  margin: 0;
}

.admin-link {
  font-size: 0.9rem;
  color: #6b7280;
  text-decoration: none;
}

.admin-link:hover {
  text-decoration: underline;
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
  gap: 8px;
}

.app-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-name {
  font-weight: 500;
  text-decoration: none;
  color: inherit;
}

.app-name:hover {
  text-decoration: underline;
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

.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.apps a {
  font-size: 0.9rem;
  color: #6b7280;
  text-decoration: none;
}

.apps a:hover {
  text-decoration: underline;
}

.actions {
  display: flex;
  gap: 6px;
}

.actions button {
  padding: 4px 12px;
  font-size: 0.85rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.actions button:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-start  { background: #dcfce7; color: #16a34a; }
.btn-stop   { background: #fef9c3; color: #854d0e; }
.btn-delete { background: #fee2e2; color: #dc2626; }
</style>
