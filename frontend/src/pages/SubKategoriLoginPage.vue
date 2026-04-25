<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

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

const isActive = computed(() => subKategori.value?.isActive ?? false)

async function loadSubKategori() {
  loadingSubKategori.value = true
  try {
    const response = await api.get(`/auth/sub-kategori/${slug.value}`)
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
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <!-- Loading State -->
    <div v-if="loadingSubKategori" class="text-center">
      <div class="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-gray-500">Memuat...</p>
    </div>

    <!-- Under Construction State -->
    <div v-else-if="subKategori && !isActive" class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div class="w-20 h-20 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-3">Segera Hadir</h1>
        <p class="text-gray-600 mb-6">
          Akses login untuk <span class="font-semibold">{{ subKategori.nama }}</span> sedang dalam tahap pengembangan.
        </p>
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
            Beranda
          </router-link>
        </div>
      </div>
      <p class="text-center text-gray-500 text-sm mt-6">
        {{ subKategori.kategori?.nama }} - {{ subKategori.nama }}
      </p>
    </div>

    <!-- Login Form Card -->
    <div v-else-if="subKategori && isActive" class="w-full max-w-[420px]">
      <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <!-- Green Top Accent -->
        <div class="h-1.5 bg-gradient-to-r from-green-500 via-green-600 to-teal-600"></div>

        <!-- Header: Logo BPJS + PENTAS -->
        <div class="pt-10 pb-2 px-10 text-center">
          <img src="/images/Asset2.png" alt="BPJS Kesehatan" class="h-11 mx-auto mb-5" />
          <img src="/images/Asset36.png" alt="PENTAS" class="h-[72px] mx-auto mb-2" />
        </div>

        <!-- Login Header -->
        <div class="mx-10 mt-4 mb-2">
          <div class="border-b-[3px] border-green-600 pb-3 inline-block">
            <span class="text-green-700 font-bold text-xl tracking-wide">Login</span>
          </div>
          <div class="border-b border-gray-200 -mt-[3px]"></div>
        </div>

        <!-- Posisi Badge -->
        <div class="px-10 pt-4">
          <div class="inline-flex items-center bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <svg class="w-4 h-4 text-green-600 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="text-green-700 text-sm font-semibold">{{ subKategori.nama }}</span>
          </div>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="px-10 pt-6 pb-10 space-y-4">
          <!-- NPP Input -->
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2 ml-1">Username / NPP</label>
            <div class="flex items-center bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-200 focus-within:border-green-500 focus-within:bg-white transition-all duration-300">
              <div class="pl-5 pr-4 py-4 flex items-center border-r border-gray-200">
                <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <input
                id="npp"
                v-model="npp"
                type="text"
                placeholder="Masukkan NPP Anda"
                class="flex-1 bg-transparent px-4 py-4 text-gray-700 placeholder-gray-400 focus:outline-none text-[15px]"
                :disabled="loading"
                autocomplete="username"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div>
            <label class="block text-sm font-medium text-gray-500 mb-2 ml-1">Password</label>
            <div class="flex items-center bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-200 focus-within:border-green-500 focus-within:bg-white transition-all duration-300">
              <div class="pl-5 pr-4 py-4 flex items-center border-r border-gray-200">
                <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Masukkan Password"
                class="flex-1 bg-transparent px-4 py-4 text-gray-700 placeholder-gray-400 focus:outline-none text-[15px]"
                :disabled="loading"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="pr-5 flex items-center"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" class="w-5 h-5 text-gray-400 hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-5 h-5 text-gray-400 hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="p-3.5 bg-red-50 border border-red-200 rounded-2xl">
            <p class="text-red-600 text-sm flex items-center">
              <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ errorMessage }}
            </p>
          </div>

          <!-- Sign In Button -->
          <div class="pt-2">
            <button
              type="submit"
              class="w-full py-4 px-6 rounded-full font-bold text-white text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 flex items-center justify-center active:scale-[0.98]"
              :class="loading ? 'opacity-70 cursor-not-allowed' : ''"
              :disabled="loading"
            >
              <span v-if="loading" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
              <span v-else>Sign In</span>
            </button>
          </div>
        </form>

        <!-- Bottom Bar -->
        <div class="h-2.5 bg-gradient-to-r from-green-600 via-green-800 to-blue-900"></div>
      </div>

      <!-- Back Links -->
      <div class="flex justify-between mt-6 text-sm px-2">
        <router-link to="/login" class="text-gray-400 hover:text-green-600 transition-colors flex items-center group">
          <svg class="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Pilih Posisi Lain
        </router-link>
        <router-link to="/" class="text-gray-400 hover:text-green-600 transition-colors">
          Beranda
        </router-link>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="notFound" class="text-center">
      <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">{{ errorMessage }}</h2>
      <p class="text-gray-500">Mengalihkan ke halaman login...</p>
    </div>
  </div>
</template>
