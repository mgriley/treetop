<template>
  <div class="log-panel">
    <div class="log-header">
      <span>Logs</span>
      <button @click="$emit('close')">✕</button>
    </div>
    <div class="log-body" ref="logBody" @scroll="onScroll">
      <div
        v-for="(entry, i) in lines"
        :key="i"
        :class="['log-line', entry.type]"
      >{{ entry.line }}</div>
      <div v-if="lines.length === 0" class="log-empty">No output yet...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps<{ logUrl: string }>();
defineEmits<{ close: [] }>();

interface LogEntry { line: string; type: 'stdout' | 'stderr' }

const lines = ref<LogEntry[]>([]);
const logBody = ref<HTMLElement | null>(null);
const isFollowing = ref(true);
let source: EventSource | null = null;

function isAtBottom(el: HTMLElement) {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
}

function onScroll() {
  if (logBody.value) isFollowing.value = isAtBottom(logBody.value);
}

function connect() {
  source = new EventSource(props.logUrl);
  source.onmessage = async (e) => {
    lines.value.push(JSON.parse(e.data));
    if (!isFollowing.value) return;
    await nextTick();
    if (logBody.value) logBody.value.scrollTop = logBody.value.scrollHeight;
  };
}

onMounted(connect);
onUnmounted(() => source?.close());
</script>

<style scoped>
.log-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 8px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.85rem;
  font-weight: 500;
}

.log-header button {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.9rem;
}

.log-body {
  background: #0f172a;
  color: #e2e8f0;
  font-family: monospace;
  font-size: 0.8rem;
  height: 240px;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log-line.stderr {
  color: #fca5a5;
}

.log-empty {
  color: #475569;
}
</style>
