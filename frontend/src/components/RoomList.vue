<template>
  <div class="room-list">
    <div
      v-for="room in rooms"
      :key="room.id"
      class="room-item"
      :class="{ active: currentRoom?.id === room.id }"
      @click="$emit('select', room)"
    >
      <span class="room-icon">#</span>
      <span class="room-name">{{ room.name }}</span>
    </div>
    <div v-if="rooms.length === 0" class="empty">No rooms yet</div>
  </div>
</template>

<script setup>
defineProps({ rooms: Array, currentRoom: Object })
defineEmits(['select'])
</script>

<style scoped>
.room-list { flex: 1; overflow-y: auto; padding: 0.5rem 0; }
.room-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; border-radius: 4px; margin: 0 0.5rem; }
.room-item:hover { background: rgba(255,255,255,0.1); }
.room-item.active { background: rgba(255,255,255,0.2); }
.room-icon { color: rgba(255,255,255,0.6); }
.room-name { font-size: 0.9rem; }
.empty { text-align: center; color: rgba(255,255,255,0.4); font-size: 0.875rem; padding: 1rem; }
</style>
