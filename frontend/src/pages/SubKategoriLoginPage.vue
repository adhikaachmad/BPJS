<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const npp = ref('')
const password = ref('')
const loading = ref(false)
const loadingSubKategori = ref(true)
const errorMessage = ref('')
const subKategori = ref(null)
const showPassword = ref(false)
const notFound = ref(false)

const slug = computed(() => route.params.slug)

const colorMap = {
  'TAD': {
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    ring: 'focus:ring-emerald-500'
  },
  'Pegawai': {
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    ring: 'focus:ring-blue-500'
  },
  'Petugas Sentralisasi': {
    gradient: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    ring: 'focus:ring-purple-500'
  }
}

const colors = computed(() => {
  if (!subKategori.value?.kategori) return colorMap['TAD']
  return colorMap[subKategori.value.kategori.nama] || colorMap['TAD']
})

const isActive = computed(() => subKategori.value?.isActive ?? false)

async function loadSubKategori() {
  loadingSubKategori.value = true
  try {
    const response = await axios.get(`/api/auth/sub-kategori/${slug.value}`)
    subKategori.value = response.data.subKategori
  } catch (error) {
    notFound.value = true
    errorMessage.value = 'Sub kategori tidak ditemukan'
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } finally {
    loadingSubKategori.value = false
  }
}

async function handleLogin() {
  if (!npp.value || !password.value) {
    errorMessage.value = 'NPP dan password tidak boleh kosong'
    return
  }

  loading.value = true
  errorMessage.value = ''

  const success = await authStore.loginWithSubKategori(npp.value, password.value, slug.value)

  if (success) {
    const userSubKategoriId = authStore.user?.subKategori?.id
    const defaultRedirect = userSubKategoriId ? `/sub-kategori/${userSubKategoriId}` : '/'
    const redirect = route.query.redirect || defaultRedirect
    router.push(redirect)
  } else {
    errorMessage.value = authStore.error || 'Login gagal'
  }

  loading.value = false
}

onMounted(() => {
  loadSubKategori()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loadingSubKategori" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat...</p>
      </div>
    </div>

    <!-- Under Construction State -->
    <div v-else-if="subKategori && !isActive" class="min-h-screen flex items-center justify-center p-4">
      <div class="max-w-md w-full">
        <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <!-- Icon -->
          <div class="w-20 h-20 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
            <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>

          <h1 class="text-2xl font-bold text-gray-900 mb-3">Segera Hadir</h1>
          <p class="text-gray-600 mb-6">
            Akses login untuk <span class="font-semibold">{{ subKategori.nama }}</span> sedang dalam tahap pengembangan.
          </p>

          <!-- Info Box -->
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="font-medium text-amber-800 text-sm">Dalam Pengembangan</p>
                <p class="text-sm text-amber-700 mt-1">
                  Fitur ini akan segera tersedia. Silakan hubungi administrator untuk informasi lebih lanjut.
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3">
            <router-link
              to="/login"
              class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors inline-flex items-center justify-center text-sm"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Pilih Posisi Lain
            </router-link>
            <router-link
              to="/"
              class="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors inline-flex items-center justify-center text-sm"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Beranda
            </router-link>
          </div>
        </div>

        <!-- Info -->
        <p class="text-center text-gray-500 text-sm mt-6">
          {{ subKategori.kategori?.nama }} - {{ subKategori.nama }}
        </p>
      </div>
    </div>

    <!-- Login Form -->
    <div v-else-if="subKategori && isActive" class="min-h-screen flex">
      <!-- Left Side - Branding -->
      <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br p-12 items-center justify-center" :class="colors.gradient">
        <div class="max-w-md text-center">
          <div class="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-white mb-4">{{ subKategori.nama }}</h2>
          <p class="text-white/80 text-lg">{{ subKategori.kategori.nama }}</p>
          <p class="text-white/60 mt-2">{{ subKategori.deskripsi }}</p>
        </div>
      </div>

      <!-- Right Side - Form -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="w-full max-w-md">
          <!-- Header -->
          <div class="mb-8">
            <router-link to="/" class="inline-flex items-center mb-6">
              <img src="/images/Asset2.png" alt="BPJS Kesehatan" class="h-10" />
            </router-link>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Masuk ke Akun Anda</h1>
            <p class="text-gray-600">
              Login sebagai <span class="font-medium" :class="colors.text">{{ subKategori.nama }}</span>
            </p>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleLogin" class="space-y-5">
            <!-- NPP Input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2" for="npp">
                Nomor Pokok Pegawai (NPP)
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <input
                  id="npp"
                  v-model="npp"
                  type="text"
                  placeholder="Masukkan NPP Anda"
                  class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  :class="colors.ring"
                  :disabled="loading"
                  autocomplete="username"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2" for="password">
                Password
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Masukkan password"
                  class="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  :class="colors.ring"
                  :disabled="loading"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-4 flex items-center"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="showPassword" class="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  <svg v-else class="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p class="text-red-600 text-sm flex items-center">
                <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ errorMessage }}
              </p>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="w-full py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r transition-all duration-200 flex items-center justify-center"
              :class="[colors.gradient, loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg']"
              :disabled="loading"
            >
              <span v-if="loading" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
              <span v-else>Masuk</span>
            </button>
          </form>

          <!-- Info Box -->
          <div class="mt-6 p-4 rounded-xl" :class="colors.bgLight">
            <p class="text-sm" :class="colors.text">
              <strong>Info:</strong> Halaman ini khusus untuk login {{ subKategori.nama }}.
              Pastikan Anda terdaftar sebagai {{ subKategori.nama }} untuk dapat login.
            </p>
          </div>

          <!-- Links -->
          <div class="flex justify-between mt-6 text-sm">
            <router-link to="/login" class="text-gray-600 hover:text-gray-900 transition-colors flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Pilih Posisi Lain
            </router-link>
            <router-link to="/" class="text-gray-600 hover:text-gray-900 transition-colors">
              Beranda
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="notFound" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">{{ errorMessage }}</h2>
        <p class="text-gray-500">Mengalihkan ke halaman login...</p>
      </div>
    </div>
  </div>
</template>
