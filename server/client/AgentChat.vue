<template>
  <div class="chat">
    <div class="messages" ref="messagesEl">
      <div v-if="chat.messages.length === 0" class="empty">No messages yet.</div>
      <div
        v-for="(msg, i) in chat.messages"
        :key="i"
        :class="['message', msg.role]"
      >
        <span class="bubble">{{ msg.text }}</span>
      </div>
    </div>

    <p v-if="chat.error" class="chat-error">{{ chat.error }}</p>

    <form class="input-row" @submit.prevent="submit">
      <textarea
        v-model="draft"
        rows="2"
        placeholder="Ask the agent..."
        :disabled="chat.loading"
        @keydown.enter.exact.prevent="submit"
      />
      <button type="submit" :disabled="!canSend">
        {{ chat.loading ? '…' : 'Send' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, nextTick } from 'vue';
import { AgentChat } from './AgentChat';

const props = defineProps<{ appId: string }>();

const chat = reactive(new AgentChat(props.appId));
const draft = ref('');
const messagesEl = ref<HTMLElement | null>(null);

const canSend = computed(() => draft.value.trim().length > 0 && !chat.loading);

async function submit() {
  if (!canSend.value) return;
  const prompt = draft.value.trim();
  draft.value = '';
  await chat.send(prompt);
  await nextTick();
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
}

watch(() => props.appId, (id) => {
  Object.assign(chat, reactive(new AgentChat(id)));
});
</script>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.messages {
  min-height: 120px;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty { font-size: 0.85rem; color: #9ca3af; }

.message { display: flex; }
.message.user  { justify-content: flex-end; }
.message.agent { justify-content: flex-start; }

.bubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.user  .bubble { background: #3b82f6; color: white; border-bottom-right-radius: 4px; }
.agent .bubble { background: #f3f4f6; color: #111827; border-bottom-left-radius: 4px; }

.chat-error { font-size: 0.8rem; color: #ef4444; margin: 0; }

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.input-row textarea {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.9rem;
  font-family: inherit;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  resize: none;
  outline: none;
}

.input-row textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

.input-row textarea:disabled { opacity: 0.5; }

.input-row button {
  padding: 8px 16px;
  font-size: 0.9rem;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  white-space: nowrap;
}

.input-row button:disabled { opacity: 0.4; cursor: default; }
</style>
