<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const kategori = ref(null)
const loading = ref(true)
const error = ref(null)

const userSubKategori = computed(() => {
  if (!authStore.isAuthenticated || !authStore.user?.subKategori) return null
  return authStore.user.subKategori
})

const userBelongsToThisCategory = computed(() => {
  if (!userSubKategori.value || !kategori.value) return false
  return userSubKategori.value.kategoriId === kategori.value.id
})

onMounted(async () => {
  try {
    const response = await api.get(`/kategori/${route.params.kategoriId}`)
    kategori.value = response.data

    if (authStore.isAuthenticated && userBelongsToThisCategory.value) {
      router.push(`/sub-kategori/${userSubKategori.value.id}`)
    }
  } catch (err) {
    error.value = 'Gagal memuat data kategori'
    console.error(err)
  } finally {
    loading.value = false
  }
})

function goToSubKategoriLogin(subKategori) {
  if (authStore.isAuthenticated && userSubKategori.value?.id === subKategori.id) {
    router.push(`/sub-kategori/${subKategori.id}`)
    return
  }
  router.push(`/login/${subKategori.slug}`)
}

async function handleLogout() {
  await authStore.logout()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col justify-center items-center min-h-screen p-4">
      <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md text-center">
        <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button @click="$router.go(0)" class="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
          Coba Lagi
        </button>
      </div>
    </div>

    <template v-else>
      <!-- Header -->
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <router-link to="/">
                <img src="/images/Asset2.png" alt="BPJS Kesehatan" class="h-10" />
              </router-link>
              <div class="hidden sm:block h-8 w-px bg-gray-200"></div>
              <div class="hidden sm:block">
                <nav class="flex items-center text-sm text-gray-500">
                  <router-link to="/" class="hover:text-green-600">Beranda</router-link>
                  <svg class="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span class="text-gray-900 font-medium">{{ kategori.nama }}</span>
                </nav>
              </div>
            </div>

            <!-- User Info -->
            <div v-if="authStore.isAuthenticated" class="flex items-center space-x-4">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <span class="text-green-600 font-semibold text-sm">{{ authStore.user?.nama?.charAt(0) }}</span>
                </div>
                <div class="hidden md:block text-sm">
                  <p class="font-medium text-gray-900">{{ authStore.user?.nama }}</p>
                  <p class="text-gray-500 text-xs">{{ authStore.user?.posisi }}</p>
                </div>
              </div>
              <button
                @click="handleLogout"
                class="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="bg-gradient-to-br from-green-600 to-green-700 text-white py-12">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-3xl md:text-4xl font-bold mb-2">{{ kategori.nama }}</h1>
          <p class="text-white/80 text-lg">{{ kategori.deskripsi }}</p>
        </div>
      </section>

      <!-- Sub Categories Section -->
      <section class="py-12">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-10">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Pilih Posisi Anda</h2>
            <p class="text-gray-600">Klik posisi Anda untuk login dan mengakses modul</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="subKategori in kategori.subKategoris"
              :key="subKategori.id"
              @click="goToSubKategoriLogin(subKategori)"
              class="bg-white rounded-2xl border-2 p-6 transition-all duration-300 cursor-pointer relative"
              :class="[
                subKategori.isActive
                  ? 'border-gray-200 hover:border-green-300 hover:shadow-lg'
                  : 'border-gray-100 opacity-75 hover:opacity-100',
                userSubKategori?.id === subKategori.id ? 'border-green-500 ring-2 ring-green-200' : ''
              ]"
            >
              <!-- Badge if this is user's sub-kategori -->
              <div
                v-if="userSubKategori?.id === subKategori.id"
                class="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium"
              >
                Posisi Anda
              </div>

              <!-- Coming Soon Badge -->
              <div
                v-if="!subKategori.isActive"
                class="absolute -top-2 -right-2 bg-gray-500 text-white text-xs px-3 py-1 rounded-full font-medium"
              >
                Segera Hadir
              </div>

              <div class="flex items-start space-x-4">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform"
                  :class="[
                    subKategori.isActive ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-300'
                  ]"
                >
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>

                <div class="flex-grow">
                  <h3 class="font-bold text-lg text-gray-900 mb-1">{{ subKategori.nama }}</h3>
                  <p class="text-gray-600 text-sm mb-4">{{ subKategori.deskripsi }}</p>

                  <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500">
                      {{ subKategori.moduls?.length || 0 }} Modul
                    </span>
                    <span
                      v-if="subKategori.isActive"
                      class="text-green-600 text-sm font-medium flex items-center"
                    >
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      {{ userSubKategori?.id === subKategori.id ? 'Masuk' : 'Login' }}
                    </span>
                    <span v-else class="text-gray-400 text-sm">
                      Segera Hadir
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Back Link -->
          <div class="text-center mt-10">
            <router-link
              to="/"
              class="text-gray-600 hover:text-green-600 text-sm transition-colors inline-flex items-center"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Kembali ke Beranda
            </router-link>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
