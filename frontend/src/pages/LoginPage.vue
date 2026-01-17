<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const kategoris = ref([])

const colorMap = {
  'TAD': {
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    hoverBg: 'hover:bg-emerald-100',
    ring: 'ring-emerald-500'
  },
  'Pegawai': {
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100',
    ring: 'ring-blue-500'
  },
  'Petugas Sentralisasi': {
    gradient: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    hoverBg: 'hover:bg-purple-100',
    ring: 'ring-purple-500'
  }
}

function getColors(kategoriNama) {
  return colorMap[kategoriNama] || colorMap['TAD']
}

async function loadKategoris() {
  loading.value = true
  try {
    const response = await api.get('/kategori')
    kategoris.value = response.data
  } catch (error) {
    console.error('Failed to load kategoris:', error)
  } finally {
    loading.value = false
  }
}

function goToSubKategoriLogin(subKategori) {
  router.push(`/login/${subKategori.slug}`)
}

onMounted(() => {
  if (authStore.isAuthenticated && authStore.user?.subKategori) {
    router.push(`/sub-kategori/${authStore.user.subKategori.id}`)
    return
  }
  loadKategoris()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <router-link to="/" class="flex items-center">
            <img src="/images/Asset2.png" alt="BPJS Kesehatan" class="h-9 w-auto" />
          </router-link>
          <router-link
            to="/"
            class="text-sm text-gray-600 hover:text-green-600 transition-colors flex items-center"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </router-link>
        </div>
      </div>
    </header>

    <main class="py-12 px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Page Header -->
        <div class="text-center mb-12">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-6">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-3">Masuk ke SECURE</h1>
          <p class="text-gray-600 text-lg max-w-md mx-auto">
            Pilih kategori dan posisi Anda untuk melanjutkan
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-20">
          <div class="flex flex-col items-center">
            <div class="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
            <p class="text-gray-500">Memuat daftar kategori...</p>
          </div>
        </div>

        <!-- Kategoris List -->
        <div v-else class="space-y-6">
          <div
            v-for="kategori in kategoris"
            :key="kategori.id"
            class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <!-- Kategori Header -->
            <div
              class="px-6 py-5 bg-gradient-to-r text-white"
              :class="getColors(kategori.nama).gradient"
            >
              <div class="flex items-center">
                <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                  <svg v-if="kategori.nama === 'TAD'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <svg v-else-if="kategori.nama === 'Pegawai'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold">{{ kategori.nama }}</h2>
                  <p class="text-white/80 text-sm">{{ kategori.deskripsi }}</p>
                </div>
              </div>
            </div>

            <!-- Sub Kategori List -->
            <div class="p-6">
              <p class="text-sm text-gray-500 mb-4">Pilih posisi Anda:</p>
              <div class="flex flex-wrap gap-3">
                <button
                  v-for="sub in kategori.subKategoris"
                  :key="sub.id"
                  @click="goToSubKategoriLogin(sub)"
                  class="group inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border"
                  :class="[
                    sub.isActive
                      ? [getColors(kategori.nama).bgLight, getColors(kategori.nama).text, getColors(kategori.nama).border, getColors(kategori.nama).hoverBg, 'hover:shadow-sm']
                      : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  ]"
                >
                  <span>{{ sub.nama }}</span>
                  <span
                    v-if="!sub.isActive"
                    class="ml-2 text-xs px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full"
                  >
                    Segera
                  </span>
                  <svg
                    v-else
                    class="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Login Link -->
        <div class="mt-12 text-center">
          <div class="inline-flex items-center bg-gray-100 rounded-xl px-6 py-4">
            <span class="text-gray-600 mr-3">Admin?</span>
            <router-link
              to="/admin/login"
              class="text-green-600 font-semibold hover:text-green-700 transition-colors"
            >
              Login Admin
            </router-link>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="py-8 mt-auto">
      <div class="text-center">
        <p class="text-gray-500 text-sm">
          &copy; {{ new Date().getFullYear() }} BPJS Kesehatan. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>
