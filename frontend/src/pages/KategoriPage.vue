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

// Login form
const showLoginModal = ref(false)
const selectedSubKategori = ref(null)
const loginForm = ref({ npp: '', password: '' })
const loginLoading = ref(false)
const loginError = ref('')
const showPassword = ref(false)

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

function openLoginModal(subKategori) {
  // If already logged in
  if (authStore.isAuthenticated) {
    // Check if user belongs to this sub-kategori
    if (userSubKategori.value?.id === subKategori.id) {
      router.push(`/sub-kategori/${subKategori.id}`)
    } else if (userBelongsToThisCategory.value) {
      // User logged in but clicked different sub-kategori in same category
      loginError.value = `Anda terdaftar sebagai ${userSubKategori.value.nama}, bukan ${subKategori.nama}`
      selectedSubKategori.value = subKategori
      showLoginModal.value = true
    } else {
      // User logged in but from different category
      loginError.value = `Anda terdaftar di kategori ${userSubKategori.value.kategori?.nama}. Silakan logout terlebih dahulu.`
      selectedSubKategori.value = subKategori
      showLoginModal.value = true
    }
    return
  }

  // Not logged in, show login modal
  selectedSubKategori.value = subKategori
  loginForm.value = { npp: '', password: '' }
  loginError.value = ''
  showLoginModal.value = true
}

async function handleLogin() {
  if (!loginForm.value.npp || !loginForm.value.password) {
    loginError.value = 'NPP dan password harus diisi'
    return
  }

  loginLoading.value = true
  loginError.value = ''

  try {
    const success = await authStore.loginWithSubKategori(
      loginForm.value.npp,
      loginForm.value.password,
      selectedSubKategori.value.slug
    )

    if (success) {
      showLoginModal.value = false
      router.push(`/sub-kategori/${selectedSubKategori.value.id}`)
    } else {
      loginError.value = authStore.error || 'Login gagal'
    }
  } catch (err) {
    loginError.value = 'Terjadi kesalahan saat login'
  } finally {
    loginLoading.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  loginError.value = ''
}

function closeModal() {
  showLoginModal.value = false
  loginError.value = ''
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
            <p class="text-gray-600">Login sesuai dengan posisi Anda untuk mengakses modul</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="subKategori in kategori.subKategoris"
              :key="subKategori.id"
              @click="openLoginModal(subKategori)"
              class="card cursor-pointer hover:border-bpjs-500 border-2 border-transparent group relative"
              :class="{ 'ring-2 ring-bpjs-500 border-bpjs-500': userSubKategori?.id === subKategori.id }"
            >
              <!-- Badge if this is user's sub-kategori -->
              <div v-if="userSubKategori?.id === subKategori.id" class="absolute -top-2 -right-2 bg-bpjs-500 text-white text-xs px-2 py-1 rounded-full">
                Posisi Anda
              </div>

              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 gradient-bpjs rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
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
                    <span class="text-bpjs-600 text-sm font-medium flex items-center group-hover:translate-x-1 transition-transform">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Login & Masuk
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Login Modal -->
    <div v-if="showLoginModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto gradient-bpjs rounded-2xl flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-800">Login {{ selectedSubKategori?.nama }}</h2>
          <p class="text-gray-500 text-sm mt-1">Masukkan NPP dan password Anda</p>
        </div>

        <!-- Already logged in as different user -->
        <div v-if="authStore.isAuthenticated && loginError" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p class="text-amber-700 text-sm">{{ loginError }}</p>
          <button @click="handleLogout" class="mt-2 text-amber-700 underline text-sm font-medium">
            Logout dan login ulang
          </button>
        </div>

        <!-- Login Form -->
        <form v-if="!authStore.isAuthenticated || !userBelongsToThisCategory" @submit.prevent="handleLogin">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-medium mb-2">NPP</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
              <input
                v-model="loginForm.npp"
                type="text"
                placeholder="Masukkan NPP"
                class="input-field pl-10"
                :disabled="loginLoading"
              />
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-medium mb-2">Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Masukkan password"
                class="input-field pl-10 pr-10"
                :disabled="loginLoading"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="loginError && !authStore.isAuthenticated" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p class="text-red-600 text-sm flex items-center">
              <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ loginError }}
            </p>
          </div>

          <!-- Info Box -->
          <div class="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p class="text-blue-700 text-sm">
              <strong>Info:</strong> Anda harus terdaftar sebagai <strong>{{ selectedSubKategori?.nama }}</strong> untuk login di halaman ini.
            </p>
          </div>

          <!-- Buttons -->
          <div class="flex space-x-3">
            <button
              type="button"
              @click="closeModal"
              class="flex-1 btn-secondary"
              :disabled="loginLoading"
            >
              Batal
            </button>
            <button
              type="submit"
              class="flex-1 btn-primary flex items-center justify-center"
              :disabled="loginLoading"
            >
              <span v-if="loginLoading" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
              <span v-else>Login</span>
            </button>
          </div>
        </form>

        <!-- If user is logged in but clicked wrong sub-kategori -->
        <div v-else class="text-center">
          <button @click="router.push(`/sub-kategori/${userSubKategori.id}`)" class="btn-primary w-full mb-3">
            Masuk ke {{ userSubKategori?.nama }}
          </button>
          <button @click="closeModal" class="btn-secondary w-full">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
