<template>
  <div class="secret-manager">
    <div class="key-list">
      <div v-for="s in secrets" :key="s.key" class="key-row">
        <span class="key-name">{{ s.key }}</span>
        <span :class="['badge', s.isSet ? 'set' : 'unset']">{{ s.isSet ? 'set' : 'not set' }}</span>
        <button class="btn-action" @click="startEdit(s.key)">{{ s.isSet ? 'Update' : 'Set' }}</button>
        <button v-if="s.isSet" class="btn-clear" @click="clear(s.key)">Clear</button>
      </div>
    </div>

    <form v-if="editingKey" class="edit-form" @submit.prevent="submit">
      <span class="edit-key">{{ editingKey }}</span>
      <input v-model="formValue" type="password" placeholder="value" ref="valueInput" />
      <button type="submit" :disabled="!formValue">Save</button>
      <button type="button" class="btn-cancel" @click="cancelEdit">Cancel</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { listSecrets, setSecret, clearSecret, type SecretStatus } from './api';

const secrets = ref<SecretStatus[]>([]);
const editingKey = ref<string | null>(null);
const formValue = ref('');
const valueInput = ref<HTMLInputElement | null>(null);
const error = ref('');

async function load() {
  secrets.value = await listSecrets();
}

async function startEdit(key: string) {
  editingKey.value = key;
  formValue.value = '';
  error.value = '';
  await nextTick();
  valueInput.value?.focus();
}

function cancelEdit() {
  editingKey.value = null;
  formValue.value = '';
  error.value = '';
}

async function submit() {
  if (!formValue.value || !editingKey.value) return;
  error.value = '';
  try {
    await setSecret(editingKey.value, formValue.value);
    cancelEdit();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save secret';
  }
}

async function clear(key: string) {
  error.value = '';
  try {
    await clearSecret(key);
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to clear secret';
  }
}

onMounted(load);
</script>

<style scoped>
.secret-manager { display: flex; flex-direction: column; gap: 8px; }

.key-list { display: flex; flex-direction: column; gap: 4px; }

.key-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.key-name { flex: 1; font-family: monospace; font-size: 0.9rem; color: #111827; }

.badge {
  font-size: 0.75rem;
  padding: 2px 7px;
  border-radius: 99px;
}

.badge.set   { background: #dcfce7; color: #16a34a; }
.badge.unset { background: #fef9c3; color: #854d0e; }

.btn-action {
  padding: 4px 10px;
  font-size: 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  cursor: pointer;
}

.btn-clear {
  padding: 4px 10px;
  font-size: 0.8rem;
  border: none;
  border-radius: 4px;
  background: #fee2e2;
  color: #dc2626;
  cursor: pointer;
}

.edit-form {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
}

.edit-key { font-family: monospace; font-size: 0.9rem; color: #1d4ed8; white-space: nowrap; }

.edit-form input {
  flex: 1;
  padding: 6px 10px;
  font-size: 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  background: white;
}

.edit-form input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

.edit-form button[type="submit"] {
  padding: 6px 14px;
  font-size: 0.9rem;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}

.edit-form button[type="submit"]:disabled { opacity: 0.4; cursor: default; }

.btn-cancel {
  padding: 6px 12px;
  font-size: 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  cursor: pointer;
}

.error { font-size: 0.85rem; color: #ef4444; margin: 0; }
</style>
