<template>
  <div class="overlay" @click.self="$emit('cancel')">
    <div class="modal">
      <h2>Name your app</h2>
      <p class="source-url">{{ url }}</p>

      <label>
        Subdomain
        <input
          ref="inputEl"
          v-model="name"
          type="text"
          placeholder="my-app"
          spellcheck="false"
          @keydown.enter="submit"
          @keydown.esc="$emit('cancel')"
        />
      </label>
      <p class="preview" v-if="name">
        → <code>{{ name }}.localhost</code>
      </p>
      <p class="validation-error" v-if="validationError">{{ validationError }}</p>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('cancel')">Cancel</button>
        <button class="btn-install" :disabled="!isValid" @click="submit">Install</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const props = defineProps<{ url: string }>();
const emit = defineEmits<{
  confirm: [name: string];
  cancel: [];
}>();

const name = ref('');
const inputEl = ref<HTMLInputElement | null>(null);

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

const validationError = computed(() => {
  if (!name.value) return '';
  if (!NAME_RE.test(name.value)) return 'Lowercase letters, numbers and hyphens only';
  if (name.value.length > 63) return 'Max 63 characters';
  return '';
});

const isValid = computed(() => name.value.length > 0 && validationError.value === '');

function submit() {
  if (isValid.value) emit('confirm', name.value);
}

onMounted(() => inputEl.value?.focus());
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: white;
  border-radius: 10px;
  padding: 28px;
  width: 400px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}

h2 {
  font-size: 1.1rem;
  margin: 0;
  font-family: sans-serif;
}

.source-url {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
  word-break: break-all;
  font-family: monospace;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  font-family: sans-serif;
  color: #374151;
}

input {
  padding: 9px 12px;
  font-size: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  font-family: monospace;
}

input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

.preview {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
  font-family: sans-serif;
}

.preview code {
  font-family: monospace;
  color: #111;
}

.validation-error {
  font-size: 0.8rem;
  color: #ef4444;
  margin: 0;
  font-family: sans-serif;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.actions button {
  padding: 8px 18px;
  font-size: 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: sans-serif;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-install {
  background: #3b82f6;
  color: white;
}

.btn-install:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
