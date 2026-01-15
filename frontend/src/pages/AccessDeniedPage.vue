<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userSubKategori = computed(() => route.query.userSubKategori || authStore.user?.subKategori?.nama)
const userSubKategoriId = computed(() => route.query.userSubKategoriId || authStore.user?.subKategori?.id)

function goToMySubKategori() {
  if (userSubKategoriId.value) {
    router.push(`/sub-kategori/${userSubKategoriId.value}`)
  } else {
    router.push('/')
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
      <!-- Icon -->
      <div class="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>

      <!-- Title -->
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h1>

      <!-- Message -->
      <p class="text-gray-600 mb-6">
        Anda tidak memiliki akses ke halaman ini.
        <template v-if="userSubKategori">
          <br><br>
          Anda terdaftar sebagai <strong class="text-bpjs-600">{{ userSubKategori }}</strong>.
          Silakan akses halaman yang sesuai dengan posisi Anda.
        </template>
      </p>

      <!-- User Info Card -->
      <div v-if="authStore.isAuthenticated" class="bg-gray-50 rounded-xl p-4 mb-6 text-left">
        <p class="text-sm text-gray-500 mb-1">Login sebagai:</p>
        <p class="font-semibold text-gray-800">{{ authStore.user?.nama }}</p>
        <p class="text-sm text-gray-600">{{ authStore.user?.posisi }} - {{ userSubKategori }}</p>
      </div>

      <!-- Actions -->
      <div class="space-y-3">
        <button
          v-if="userSubKategoriId"
          @click="goToMySubKategori"
          class="w-full btn-primary"
        >
          Masuk ke Halaman {{ userSubKategori }}
        </button>

        <button @click="handleLogout" class="w-full btn-secondary">
          Logout & Ganti Akun
        </button>

        <router-link
          to="/"
          class="block text-gray-500 hover:text-gray-700 text-sm mt-4"
        >
          Kembali ke Beranda
        </router-link>
      </div>
    </div>
  </div>
</template>
