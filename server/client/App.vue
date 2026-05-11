<template>
  <LoginPage v-if="!authState.token" />
  <RouterView v-else />
</template>

<script setup lang="ts">
import { authState } from './api';
import LoginPage from './LoginPage.vue';
</script>
