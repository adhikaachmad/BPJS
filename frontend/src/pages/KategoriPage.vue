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

// Check if user is already logged in and belongs to this category
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

    // If user is already logged in and belongs to this category, redirect to their sub-kategori
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
  // If already logged in as this subKategori, go directly to dashboard
  if (authStore.isAuthenticated && userSubKategori.value?.id === subKategori.id) {
    router.push(`/sub-kategori/${subKategori.id}`)
    return
  }

  // Go to login page - it will show Under Construction if inactive
  router.push(`/login/${subKategori.slug}`)
}

async function handleLogout() {
  await authStore.logout()
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col justify-center items-center min-h-screen">
      <p class="text-red-500 mb-4">{{ error }}</p>
      <button @click="$router.go(0)" class="btn-primary">Coba Lagi</button>
    </div>

    <template v-else>
      <!-- Hero Section -->
      <section class="gradient-bpjs text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center mb-4">
            <router-link to="/" class="text-white/80 hover:text-white transition-colors">
              Beranda
            </router-link>
            <svg class="w-4 h-4 mx-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span>{{ kategori.nama }}</span>
          </div>

          <h1 class="text-3xl md:text-4xl font-bold mb-2">{{ kategori.nama }}</h1>
          <p class="text-lg opacity-80">{{ kategori.deskripsi }}</p>

          <!-- Login Status -->
          <div v-if="authStore.isAuthenticated" class="mt-4 inline-flex items-center bg-white/20 rounded-lg px-4 py-2">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="mr-3">{{ authStore.user?.nama }} ({{ authStore.user?.posisi }})</span>
            <button @click="handleLogout" class="text-white/80 hover:text-white underline text-sm">
              Logout
            </button>
          </div>
        </div>
      </section>

      <!-- Sub Categories Section -->
      <section class="py-12 -mt-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-10">
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Pilih Sub Kategori</h2>
            <p class="text-gray-600">Klik posisi Anda untuk login dan mengakses modul</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="subKategori in kategori.subKategoris"
              :key="subKategori.id"
              @click="goToSubKategoriLogin(subKategori)"
              class="card border-2 border-transparent group relative cursor-pointer"
              :class="[
                subKategori.isActive
                  ? 'hover:border-bpjs-500 hover:shadow-lg'
                  : 'opacity-75 hover:opacity-100 hover:border-gray-300',
                userSubKategori?.id === subKategori.id ? 'ring-2 ring-bpjs-500 border-bpjs-500' : ''
              ]"
            >
              <!-- Badge if this is user's sub-kategori -->
              <div v-if="userSubKategori?.id === subKategori.id" class="absolute -top-2 -right-2 bg-bpjs-500 text-white text-xs px-2 py-1 rounded-full">
                Posisi Anda
              </div>

              <!-- Coming Soon Badge -->
              <div v-if="!subKategori.isActive" class="absolute -top-2 -right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                Coming Soon
              </div>

              <div class="flex items-start space-x-4">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform"
                  :class="[
                    subKategori.isActive ? 'gradient-bpjs group-hover:scale-110' : 'bg-gray-300'
                  ]"
                >
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>

                <div class="flex-grow">
                  <h3 class="font-bold text-lg text-gray-800 mb-1">{{ subKategori.nama }}</h3>
                  <p class="text-gray-600 text-sm mb-3">{{ subKategori.deskripsi }}</p>

                  <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500">
                      {{ subKategori.moduls?.length || 0 }} Modul
                    </span>
                    <span
                      v-if="subKategori.isActive"
                      class="text-bpjs-600 text-sm font-medium flex items-center group-hover:translate-x-1 transition-transform"
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
        </div>
      </section>
    </template>
  </div>
</template>
