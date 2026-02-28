import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

export const useChatStore = defineStore('chat', () => {
  const rooms = ref([])
  const currentRoom = ref(null)
  const messagesByRoom = reactive({})
  const socket = ref(null)
  const connectionStatus = ref('disconnected')

  function connect(token) {
    socket.value = io(WS_URL, { auth: { token } })
    socket.value.on('connect', () => { connectionStatus.value = 'connected' })
    socket.value.on('disconnect', () => { connectionStatus.value = 'disconnected' })
    socket.value.on('new-message', (message) => {
      const roomId = message.room_id
      if (!messagesByRoom[roomId]) messagesByRoom[roomId] = []
      // Replace optimistic message if exists
      const idx = messagesByRoom[roomId].findIndex(m => m.id === message.optimisticId)
      if (idx !== -1) {
        messagesByRoom[roomId].splice(idx, 1, message)
      } else {
        messagesByRoom[roomId].push(message)
      }
    })
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    connectionStatus.value = 'disconnected'
  }

  async function fetchRooms() {
    const auth = useAuthStore()
    const res = await fetch(`${API_URL}/api/rooms`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch rooms')
    rooms.value = await res.json()
  }

  async function createRoom(name, description) {
    const auth = useAuthStore()
    const res = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ name, description })
    })
    if (!res.ok) throw new Error('Failed to create room')
    const room = await res.json()
    rooms.value.push(room)
    return room
  }

  async function joinRoom(room) {
    if (currentRoom.value?.id === room.id) return
    if (currentRoom.value && socket.value) {
      socket.value.emit('leave-room', { roomId: currentRoom.value.id })
    }
    currentRoom.value = room
    if (!messagesByRoom[room.id]) messagesByRoom[room.id] = []
    if (socket.value) {
      socket.value.emit('join-room', { roomId: room.id })
    }
    await loadMessages(room.id)
  }

  async function loadMessages(roomId, before = null) {
    const auth = useAuthStore()
    const params = before ? `?before=${before}&limit=50` : '?limit=50'
    const res = await fetch(`${API_URL}/api/rooms/${roomId}/messages${params}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    if (!res.ok) throw new Error('Failed to load messages')
    const messages = await res.json()
    if (before) {
      messagesByRoom[roomId] = [...messages, ...(messagesByRoom[roomId] || [])]
    } else {
      messagesByRoom[roomId] = messages
    }
  }

  function sendMessage(content) {
    if (!socket.value || !currentRoom.value) return
    const auth = useAuthStore()
    const optimisticId = `opt-${Date.now()}-${Math.random()}`
    const tempMessage = {
      id: optimisticId,
      content,
      room_id: currentRoom.value.id,
      user_id: auth.user?.id,
      username: auth.user?.username,
      created_at: new Date().toISOString(),
      status: 'sending'
    }
    if (!messagesByRoom[currentRoom.value.id]) messagesByRoom[currentRoom.value.id] = []
    messagesByRoom[currentRoom.value.id].push(tempMessage)
    socket.value.emit('send-message', { roomId: currentRoom.value.id, content, optimisticId })
  }

  return {
    rooms, currentRoom, messagesByRoom, socket, connectionStatus,
    connect, disconnect, fetchRooms, createRoom, joinRoom, loadMessages, sendMessage
  }
})
