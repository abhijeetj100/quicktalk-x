<template>
  <div class="chat-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>QuickTalk-X</h2>
        <span class="status" :class="chat.connectionStatus">{{ chat.connectionStatus }}</span>
        <button @click="handleLogout" class="logout-btn">Logout</button>
      </div>
      <div class="room-actions">
        <button @click="showCreateRoom = true" class="create-room-btn">+ New Room</button>
      </div>
      <RoomList :rooms="chat.rooms" :currentRoom="chat.currentRoom" @select="chat.joinRoom" />
    </aside>
    <main class="chat-main">
      <div v-if="!chat.currentRoom" class="no-room">
        <p>Select a room to start chatting</p>
      </div>
      <template v-else>
        <div class="chat-header">
          <h3># {{ chat.currentRoom.name }}</h3>
          <p v-if="chat.currentRoom.description">{{ chat.currentRoom.description }}</p>
        </div>
        <MessageList :messages="chat.messagesByRoom[chat.currentRoom.id] || []" :currentUserId="auth.user?.id" />
        <MessageInput @send="chat.sendMessage" />
      </template>
    </main>
    <div v-if="showCreateRoom" class="modal-overlay" @click.self="showCreateRoom = false">
      <div class="modal">
        <h3>Create Room</h3>
        <input v-model="newRoomName" placeholder="Room name" />
        <input v-model="newRoomDesc" placeholder="Description (optional)" />
        <div class="modal-actions">
          <button @click="handleCreateRoom">Create</button>
          <button @click="showCreateRoom = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import RoomList from '../components/RoomList.vue'
import MessageList from '../components/MessageList.vue'
import MessageInput from '../components/MessageInput.vue'

const router = useRouter()
const auth = useAuthStore()
const chat = useChatStore()
const showCreateRoom = ref(false)
const newRoomName = ref('')
const newRoomDesc = ref('')

onMounted(async () => {
  if (!auth.token) return router.push('/login')
  chat.connect(auth.token)
  await chat.fetchRooms()
})

onUnmounted(() => {
  chat.disconnect()
})

async function handleCreateRoom() {
  if (!newRoomName.value.trim()) return
  await chat.createRoom(newRoomName.value.trim(), newRoomDesc.value.trim())
  newRoomName.value = ''
  newRoomDesc.value = ''
  showCreateRoom.value = false
}

function handleLogout() {
  chat.disconnect()
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.chat-container { display: flex; height: 100vh; font-family: sans-serif; }
.sidebar { width: 260px; background: #2c3e50; color: white; display: flex; flex-direction: column; }
.sidebar-header { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
.sidebar-header h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
.status { font-size: 0.75rem; padding: 0.2rem 0.4rem; border-radius: 3px; }
.status.connected { background: #27ae60; }
.status.disconnected { background: #e74c3c; }
.logout-btn { float: right; background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; cursor: pointer; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.8rem; }
.room-actions { padding: 0.75rem; }
.create-room-btn { width: 100%; padding: 0.5rem; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; }
.chat-main { flex: 1; display: flex; flex-direction: column; background: #f8f9fa; }
.no-room { flex: 1; display: flex; align-items: center; justify-content: center; color: #888; }
.chat-header { padding: 1rem; background: white; border-bottom: 1px solid #ddd; }
.chat-header h3 { margin: 0; }
.chat-header p { margin: 0.25rem 0 0; color: #888; font-size: 0.875rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 8px; padding: 1.5rem; width: 320px; }
.modal h3 { margin: 0 0 1rem; }
.modal input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 0.75rem; box-sizing: border-box; }
.modal-actions { display: flex; gap: 0.5rem; }
.modal-actions button { flex: 1; padding: 0.5rem; border: none; border-radius: 4px; cursor: pointer; }
.modal-actions button:first-child { background: #1a73e8; color: white; }
</style>
