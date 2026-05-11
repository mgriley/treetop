<template>
  <div class="secret-manager">
    <div v-if="keys.length > 0" class="key-list">
      <div v-for="key in keys" :key="key" class="key-row">
        <span class="key-name">{{ key }}</span>
        <button class="btn-update" @click="startUpdate(key)">Update</button>
        <button class="btn-delete" @click="remove(key)">Delete</button>
      </div>
    </div>
    <p v-else class="empty">No secrets stored yet.</p>

    <form class="add-form" @submit.prevent="submit">
      <input
        v-model="formKey"
        type="text"
        placeholder="KEY_NAME"
        spellcheck="false"
        class="input-key"
      />
      <input
        v-model="formValue"
        type="password"
        placeholder="value"
        class="input-value"
      />
      <button type="submit" :disabled="!canSubmit">{{ editing ? 'Update' : 'Add' }}</button>
      <button v-if="editing" type="button" class="btn-cancel" @click="cancelEdit">Cancel</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { listSecrets, setSecret, deleteSecret } from './api';

const keys = ref<string[]>([]);
const formKey = ref('');
const formValue = ref('');
const editing = ref(false);
const error = ref('');

const KEY_RE = /^[A-Z0-9_]+$/;
const canSubmit = computed(() =>
  formKey.value.length > 0 &&
  formValue.value.length > 0 &&
  KEY_RE.test(formKey.value)
);

async function load() {
  keys.value = await listSecrets();
}

function startUpdate(key: string) {
  formKey.value = key;
  formValue.value = '';
  editing.value = true;
  error.value = '';
}

function cancelEdit() {
  formKey.value = '';
  formValue.value = '';
  editing.value = false;
  error.value = '';
}

async function submit() {
  if (!canSubmit.value) return;
  error.value = '';
  try {
    await setSecret(formKey.value, formValue.value);
    cancelEdit();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save secret';
  }
}

async function remove(key: string) {
  error.value = '';
  try {
    await deleteSecret(key);
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete secret';
  }
}

onMounted(load);
</script>

<style scoped>
.secret-manager { display: flex; flex-direction: column; gap: 16px; }

.key-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.key-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.key-name {
  flex: 1;
  font-family: monospace;
  font-size: 0.9rem;
  color: #111827;
}

.empty { font-size: 0.85rem; color: #9ca3af; margin: 0; }

.add-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.input-key {
  width: 180px;
  padding: 8px 12px;
  font-size: 0.9rem;
  font-family: monospace;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
}

.input-value {
  flex: 1;
  min-width: 140px;
  padding: 8px 12px;
  font-size: 0.9rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
}

.input-key:focus,
.input-value:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

.add-form button {
  padding: 8px 16px;
  font-size: 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.add-form button[type="submit"] { background: #3b82f6; color: white; }
.add-form button[type="submit"]:disabled { opacity: 0.4; cursor: default; }

.btn-cancel { background: #f3f4f6; color: #374151; }

.btn-update {
  padding: 4px 10px;
  font-size: 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  color: #374151;
}

.btn-delete {
  padding: 4px 10px;
  font-size: 0.8rem;
  border: none;
  border-radius: 4px;
  background: #fee2e2;
  color: #dc2626;
  cursor: pointer;
}

.error { font-size: 0.85rem; color: #ef4444; margin: 0; }
</style>
