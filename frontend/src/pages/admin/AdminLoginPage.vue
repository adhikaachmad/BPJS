<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMessage.value = 'Username dan password harus diisi'
    return
  }

  loading.value = true
  errorMessage.value = ''

  const success = await authStore.adminLogin(username.value, password.value)

  if (success) {
    router.push('/admin/dashboard')
  } else {
    errorMessage.value = authStore.error || 'Login gagal'
  }

  loading.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 py-12 px-4">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto bg-bpjs-500 rounded-2xl shadow-lg flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">Admin Panel</h1>
        <p class="text-gray-400">Sistem Kuesioner BPJS Kesehatan</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <form @submit.prevent="handleLogin">
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Username</label>
            <input
              v-model="username"
              type="text"
              class="input-field"
              placeholder="Masukkan username"
              :disabled="loading"
            />
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 font-medium mb-2">Password</label>
            <input
              v-model="password"
              type="password"
              class="input-field"
              placeholder="Masukkan password"
              :disabled="loading"
            />
          </div>

          <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p class="text-red-600 text-sm">{{ errorMessage }}</p>
          </div>

          <button type="submit" class="w-full btn-primary" :disabled="loading">
            <span v-if="loading">Memproses...</span>
            <span v-else>Login</span>
          </button>
        </form>
      </div>

      <div class="text-center mt-6">
        <router-link to="/" class="text-gray-400 hover:text-white text-sm">
          &larr; Kembali ke Website
        </router-link>
      </div>
    </div>
  </div>
</template>
