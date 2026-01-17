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
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <!-- Icon -->
        <div class="w-20 h-20 mx-auto bg-red-100 rounded-2xl flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-bold text-gray-900 mb-3">Akses Ditolak</h1>

        <!-- Message -->
        <p class="text-gray-600 mb-6">
          Anda tidak memiliki akses ke halaman ini.
        </p>

        <!-- User Sub Kategori Info -->
        <div v-if="userSubKategori" class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm text-amber-800">
                Anda terdaftar sebagai <strong class="text-amber-900">{{ userSubKategori }}</strong>.
                Silakan akses halaman yang sesuai dengan posisi Anda.
              </p>
            </div>
          </div>
        </div>

        <!-- User Info Card -->
        <div v-if="authStore.isAuthenticated" class="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p class="text-xs text-gray-500 mb-1">Login sebagai:</p>
          <p class="font-semibold text-gray-900">{{ authStore.user?.nama }}</p>
          <p class="text-sm text-gray-600">{{ authStore.user?.posisi }} - {{ userSubKategori }}</p>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            v-if="userSubKategoriId"
            @click="goToMySubKategori"
            class="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            Masuk ke Halaman {{ userSubKategori }}
          </button>

          <button
            @click="handleLogout"
            class="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Logout & Ganti Akun
          </button>

          <router-link
            to="/"
            class="block text-gray-500 hover:text-gray-700 text-sm mt-4 transition-colors"
          >
            Kembali ke Beranda
          </router-link>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-gray-400 text-sm mt-6">
        BPJS Kesehatan - SECURE
      </p>
    </div>
  </div>
</template>
