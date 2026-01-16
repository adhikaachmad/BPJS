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

const slug = computed(() => route.params.slug)

// Color mapping based on kategori
const colorMap = {
  'TAD': {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200'
  },
  'Pegawai': {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200'
  },
  'Petugas Sentralisasi': {
    gradient: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200'
  }
}

const colors = computed(() => {
  if (!subKategori.value?.kategori) return colorMap['TAD']
  return colorMap[subKategori.value.kategori.nama] || colorMap['TAD']
})

async function loadSubKategori() {
  loadingSubKategori.value = true
  try {
    const response = await axios.get(`/api/auth/sub-kategori/${slug.value}`)
    subKategori.value = response.data.subKategori
  } catch (error) {
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
    const redirect = route.query.redirect || '/'
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
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br" :class="colors.gradient" style="padding: 3rem 1rem;">
    <!-- Loading State -->
    <div v-if="loadingSubKategori" class="text-center">
      <div class="w-16 h-16 mx-auto mb-4">
        <svg class="animate-spin text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-white/80">Memuat...</p>
    </div>

    <!-- Login Form -->
    <div v-else-if="subKategori" class="max-w-md w-full">
      <!-- Logo & Header -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
          <svg class="w-12 h-12" :class="colors.text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">Login {{ subKategori.nama }}</h1>
        <p class="text-white/80">{{ subKategori.kategori.nama }} - {{ subKategori.deskripsi }}</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <form @submit.prevent="handleLogin">
          <!-- NPP Input -->
          <div class="mb-5">
            <label class="block text-gray-700 font-medium mb-2" for="npp">
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
                class="input-field pl-12"
                :disabled="loading"
                autocomplete="username"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div class="mb-6">
            <label class="block text-gray-700 font-medium mb-2" for="password">
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
                class="input-field pl-12 pr-12"
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
          <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
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
            class="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center"
            :class="[colors.gradient.replace('from-', 'bg-gradient-to-r from-'), loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]']"
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

        <!-- Info -->
        <div class="mt-6 pt-6 border-t border-gray-200">
          <div class="p-4 rounded-xl" :class="colors.bg">
            <p class="text-sm" :class="colors.text">
              <strong>Info:</strong> Halaman ini khusus untuk login {{ subKategori.nama }}.
              Pastikan Anda terdaftar sebagai {{ subKategori.nama }} untuk dapat login di halaman ini.
            </p>
          </div>
        </div>
      </div>

      <!-- Back Links -->
      <div class="flex justify-between mt-6 text-sm">
        <router-link to="/login" class="text-white/80 hover:text-white transition-colors">
          &larr; Pilih Posisi Lain
        </router-link>
        <router-link to="/" class="text-white/80 hover:text-white transition-colors">
          Beranda &rarr;
        </router-link>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="text-center">
      <div class="w-20 h-20 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-4">
        <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-white mb-2">{{ errorMessage }}</h2>
      <p class="text-white/80">Mengalihkan ke halaman login...</p>
    </div>
  </div>
</template>
