<template>
  <div class="message-list" ref="listEl" @scroll="handleScroll">
    <div v-if="loading" class="loading">Loading more messages...</div>
    <div v-for="message in messages" :key="message.id" class="message" :class="{ own: message.user_id === currentUserId, sending: message.status === 'sending' }">
      <div class="message-meta">
        <span class="username">{{ message.display_name || message.username }}</span>
        <span class="time">{{ formatTime(message.created_at) }}</span>
      </div>
      <div class="message-content">{{ message.content }}</div>
    </div>
    <div ref="bottomEl"></div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({ messages: Array, currentUserId: String })
const emit = defineEmits(['load-more'])
const listEl = ref(null)
const bottomEl = ref(null)
const loading = ref(false)
const isAtBottom = ref(true)

watch(() => props.messages?.length, async (newLen, oldLen) => {
  const isInitialLoad = oldLen == null || oldLen === 0
  if (newLen > (oldLen || 0)) {
    loading.value = false
    if (isInitialLoad || isAtBottom.value) {
      await nextTick()
      bottomEl.value?.scrollIntoView({ behavior: 'smooth' })
    }
  }
})

function handleScroll() {
  if (!listEl.value || loading.value) return

  const el = listEl.value
  const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
  isAtBottom.value = distanceFromBottom <= 50

  if (el.scrollTop === 0 && props.messages?.length > 0) {
    loading.value = true
    emit('load-more', props.messages[0]?.created_at)
  }
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.message-list { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.loading { text-align: center; color: #888; font-size: 0.875rem; }
.message { max-width: 70%; }
.message.own { align-self: flex-end; }
.message-meta { display: flex; gap: 0.5rem; align-items: baseline; margin-bottom: 0.2rem; }
.username { font-weight: 600; font-size: 0.875rem; color: #1a73e8; }
.time { font-size: 0.75rem; color: #888; }
.message-content { background: white; padding: 0.5rem 0.75rem; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.message.own .message-content { background: #1a73e8; color: white; }
.message.sending .message-content { opacity: 0.6; }
</style>
