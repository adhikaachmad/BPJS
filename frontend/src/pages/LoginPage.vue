<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const kategoris = ref([])

// Color mapping based on kategori
const colorMap = {
  'TAD': {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    bgInactive: 'bg-gray-100',
    textInactive: 'text-gray-400'
  },
  'Pegawai': {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    bgInactive: 'bg-gray-100',
    textInactive: 'text-gray-400'
  },
  'Petugas Sentralisasi': {
    gradient: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    bgInactive: 'bg-gray-100',
    textInactive: 'text-gray-400'
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
  // Always redirect to login page - it will show Under Construction if inactive
  router.push(`/login/${subKategori.slug}`)
}

function hasActiveSubKategori(kategori) {
  return kategori.subKategoris?.some(sk => sk.isActive)
}

onMounted(() => {
  // If user is already logged in, redirect to their sub-kategori
  if (authStore.isAuthenticated && authStore.user?.subKategori) {
    router.push(`/sub-kategori/${authStore.user.subKategori.id}`)
    return
  }
  loadKategoris()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-bpjs-500 to-bpjs-700 py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-10">
        <div class="w-20 h-20 mx-auto bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-bpjs-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">Sistem Kuesioner</h1>
        <p class="text-bpjs-100 text-lg">BPJS Kesehatan</p>
        <p class="text-white/70 mt-2">Pilih kategori sesuai posisi Anda</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="w-12 h-12 mx-auto mb-4">
          <svg class="animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p class="text-white/80">Memuat daftar kategori...</p>
      </div>

      <!-- Kategoris -->
      <div v-else class="space-y-6">
        <div
          v-for="kategori in kategoris"
          :key="kategori.id"
          class="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
        >
          <!-- Kategori Header -->
          <div class="px-6 py-5 bg-gradient-to-r" :class="getColors(kategori.nama).gradient">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <svg v-if="kategori.nama === 'TAD'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <svg v-else-if="kategori.nama === 'Pegawai'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div class="flex-1">
                <h2 class="text-xl font-bold text-white">{{ kategori.nama }}</h2>
                <p class="text-white/80 text-sm">{{ kategori.deskripsi }}</p>
              </div>
            </div>
          </div>

          <!-- Sub Kategori List Preview -->
          <div class="px-6 py-4">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="sub in kategori.subKategoris"
                :key="sub.id"
                @click.stop="goToSubKategoriLogin(sub)"
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer"
                :class="[
                  sub.isActive
                    ? [getColors(kategori.nama).bg, getColors(kategori.nama).text, 'hover:shadow-md hover:scale-105']
                    : ['bg-gray-100 text-gray-400 hover:bg-gray-200']
                ]"
              >
                <span class="flex items-center space-x-1">
                  <span>{{ sub.nama }}</span>
                  <span v-if="!sub.isActive" class="text-xs">(Coming Soon)</span>
                </span>
              </button>
            </div>
            <p class="text-gray-500 text-sm mt-3">
              Klik posisi Anda untuk login
            </p>
          </div>
        </div>
      </div>

      <!-- Admin Login Link -->
      <div class="mt-8 text-center">
        <div class="inline-flex items-center bg-white/10 rounded-xl px-6 py-3">
          <span class="text-white/80 mr-3">Admin?</span>
          <router-link to="/admin/login" class="text-white font-semibold hover:underline">
            Login Admin
          </router-link>
        </div>
      </div>

      <!-- Back to Home -->
      <div class="text-center mt-6">
        <router-link to="/" class="text-white/80 hover:text-white text-sm transition-colors">
          &larr; Kembali ke Beranda
        </router-link>
      </div>
    </div>
  </div>
</template>
