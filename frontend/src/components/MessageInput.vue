<template>
  <div class="message-input">
    <textarea
      v-model="content"
      placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
      @keydown.enter.exact.prevent="handleSend"
      rows="1"
    ></textarea>
    <button @click="handleSend" :disabled="!content.trim()">Send</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send'])
const content = ref('')

function handleSend() {
  if (!content.value.trim()) return
  emit('send', content.value.trim())
  content.value = ''
}
</script>

<style scoped>
.message-input { display: flex; gap: 0.5rem; padding: 1rem; background: white; border-top: 1px solid #ddd; }
textarea { flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: none; font-family: inherit; font-size: 0.9rem; }
button { padding: 0.5rem 1rem; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; }
button:disabled { background: #ccc; cursor: not-allowed; }
</style>
