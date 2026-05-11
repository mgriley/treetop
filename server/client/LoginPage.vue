<template>
  <div class="login-wrap">
    <div class="login-box">
      <h1>Treetop</h1>
      <form @submit.prevent="submit">
        <input
          v-model="password"
          type="password"
          placeholder="Admin password"
          autocomplete="current-password"
          autofocus
          :disabled="loading"
        />
        <button type="submit" :disabled="loading || !password">Sign in</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { login } from './api';

const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    await login(password.value);
    // authState.token is now set; App.vue reactively switches to RouterView
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed';
  } finally {
    loading.value = false;
    password.value = '';
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
}

.login-box {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 48px 40px;
  width: 320px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}

h1 {
  font-size: 1.4rem;
  margin: 0 0 28px;
  color: #111827;
  font-family: sans-serif;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input {
  padding: 10px 12px;
  font-size: 0.95rem;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  outline: none;
  font-family: sans-serif;
}

input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

button {
  padding: 10px;
  font-size: 0.95rem;
  background: #111827;
  color: white;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-family: sans-serif;
}

button:disabled {
  opacity: 0.4;
  cursor: default;
}

.error {
  margin-top: 12px;
  font-size: 0.85rem;
  color: #ef4444;
  font-family: sans-serif;
}
</style>
