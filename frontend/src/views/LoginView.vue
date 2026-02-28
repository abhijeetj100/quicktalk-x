<template>
  <div class="login-container">
    <div class="login-card">
      <h1>QuickTalk-X</h1>
      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Login</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Register</button>
      </div>
      <form @submit.prevent="handleSubmit">
        <div v-if="mode === 'register'" class="field">
          <label>Username</label>
          <input v-model="username" type="text" required placeholder="Username" />
        </div>
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" required placeholder="Email" />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="password" type="password" required placeholder="Password" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="submit-btn">{{ mode === 'login' ? 'Login' : 'Register' }}</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const mode = ref('login')
const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

async function handleSubmit() {
  error.value = ''
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value)
    } else {
      await auth.register(username.value, email.value, password.value)
    }
    router.push('/chat')
  } catch (err) {
    error.value = err.message
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f0f2f5;
}
.login-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
h1 { text-align: center; color: #1a73e8; margin-bottom: 1.5rem; }
.tabs { display: flex; margin-bottom: 1.5rem; gap: 0.5rem; }
.tabs button { flex: 1; padding: 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }
.tabs button.active { background: #1a73e8; color: white; border-color: #1a73e8; }
.field { margin-bottom: 1rem; }
.field label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; color: #555; }
.field input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
.error { color: #d32f2f; font-size: 0.875rem; margin-bottom: 0.5rem; }
.submit-btn { width: 100%; padding: 0.75rem; background: #1a73e8; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; }
.submit-btn:hover { background: #1557b0; }
</style>
