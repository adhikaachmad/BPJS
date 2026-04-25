<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const message = ref('')
const messageType = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const user = computed(() => authStore.user)

const berandaLink = computed(() => {
  if (user.value?.subKategori?.id) {
    return `/sub-kategori/${user.value.subKategori.id}`
  }
  return '/'
})

const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return true
  return newPassword.value === confirmPassword.value
})

const passwordStrength = computed(() => {
  const pw = newPassword.value
  if (!pw) return { level: 0, text: '', color: '' }
  if (pw.length < 6) return { level: 1, text: 'Terlalu pendek', color: 'bg-red-500' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 2, text: 'Lemah', color: 'bg-orange-500' }
  if (score === 2) return { level: 3, text: 'Cukup', color: 'bg-yellow-500' }
  if (score === 3) return { level: 4, text: 'Kuat', color: 'bg-green-500' }
  return { level: 5, text: 'Sangat Kuat', color: 'bg-green-600' }
})

const canSubmit = computed(() => {
  return currentPassword.value &&
    newPassword.value &&
    newPassword.value.length >= 6 &&
    confirmPassword.value &&
    passwordsMatch.value &&
    !loading.value
})

async function changePassword() {
  if (!canSubmit.value) return

  loading.value = true
  message.value = ''

  try {
    await api.post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })
    message.value = 'Password berhasil diubah! Silakan gunakan password baru saat login berikutnya.'
    messageType.value = 'success'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    message.value = err.response?.data?.error || 'Gagal mengubah password'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <router-link :to="berandaLink">
              <img src="/images/Asset2.png" alt="BPJS Kesehatan" class="h-10" />
            </router-link>
            <div class="hidden sm:block h-8 w-px bg-gray-200"></div>
            <div class="hidden sm:block">
              <nav class="flex items-center text-sm text-gray-500">
                <router-link :to="berandaLink" class="hover:text-green-600">Beranda</router-link>
                <svg class="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span class="text-gray-900 font-medium">Profil Saya</span>
              </nav>
            </div>
          </div>

          <div class="flex items-center space-x-1 sm:space-x-3">
            <router-link
              :to="berandaLink"
              class="px-3 py-2 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
            >
              Beranda
            </router-link>
            <router-link
              to="/history"
              class="px-3 py-2 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
            >
              Riwayat
            </router-link>
            <div class="h-6 w-px bg-gray-200"></div>
            <button
              @click="handleLogout"
              class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Keluar"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-green-600 to-green-700 text-white py-10">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center space-x-5">
          <div class="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span class="text-white font-bold text-3xl">{{ user?.nama?.charAt(0) }}</span>
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-bold">{{ user?.nama }}</h1>
            <p class="text-white/80 mt-1">NPP: {{ user?.npp }} &middot; {{ user?.posisi }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- Left: User Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Info Card -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 class="font-bold text-gray-900 flex items-center">
                <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Informasi Akun
              </h3>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">NPP</p>
                <p class="text-sm font-mono font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">{{ user?.npp }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <p class="text-sm text-gray-900">{{ user?.email || 'Belum diisi' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Posisi</p>
                <p class="text-sm text-gray-900">{{ user?.posisi || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Sub Kategori</p>
                <p class="text-sm text-gray-900">{{ user?.subKategori?.nama || '-' }}</p>
              </div>
            </div>
          </div>

          <!-- Location Card -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 class="font-bold text-gray-900 flex items-center">
                <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Lokasi Penempatan
              </h3>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Kedeputian Wilayah</p>
                <p class="text-sm text-gray-900">{{ user?.kepwil ? `Kepwil ${user.kepwil}` : '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Kantor Cabang</p>
                <p class="text-sm text-gray-900">{{ user?.kc || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Kantor Kabupaten</p>
                <p class="text-sm text-gray-900">{{ user?.kakab || '-' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Change Password -->
        <div class="lg:col-span-3">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <h3 class="font-bold text-gray-900 flex items-center">
                <svg class="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Ubah Password
              </h3>
              <p class="text-sm text-gray-500 mt-1">Ganti password default Anda untuk keamanan akun</p>
            </div>

            <form @submit.prevent="changePassword" class="p-6 space-y-5">
              <!-- Success/Error Message -->
              <div v-if="message" class="p-4 rounded-xl text-sm font-medium flex items-start space-x-3"
                :class="messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
                <svg v-if="messageType === 'success'" class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ message }}</span>
              </div>

              <!-- Current Password -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Password Saat Ini</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    v-model="currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    class="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    placeholder="Masukkan password saat ini"
                    required
                  />
                  <button type="button" @click="showCurrentPassword = !showCurrentPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <svg v-if="showCurrentPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Divider -->
              <div class="relative">
                <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200"></div></div>
                <div class="relative flex justify-center"><span class="px-3 bg-white text-xs text-gray-400 uppercase tracking-wider">Password Baru</span></div>
              </div>

              <!-- New Password -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Password Baru</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <input
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    class="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    placeholder="Minimal 6 karakter"
                    minlength="6"
                    required
                  />
                  <button type="button" @click="showNewPassword = !showNewPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <svg v-if="showNewPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                <!-- Password strength -->
                <div v-if="newPassword" class="mt-2">
                  <div class="flex items-center space-x-2">
                    <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-300" :class="passwordStrength.color" :style="{ width: (passwordStrength.level / 5 * 100) + '%' }"></div>
                    </div>
                    <span class="text-xs font-medium" :class="passwordStrength.level >= 3 ? 'text-green-600' : 'text-orange-600'">{{ passwordStrength.text }}</span>
                  </div>
                </div>
              </div>

              <!-- Confirm Password -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Konfirmasi Password Baru</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    class="w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 transition-all"
                    :class="!passwordsMatch ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-green-500 focus:ring-green-500/20'"
                    placeholder="Ketik ulang password baru"
                    required
                  />
                  <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <svg v-if="showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                <p v-if="!passwordsMatch" class="text-xs text-red-500 mt-1.5 flex items-center">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Password tidak cocok
                </p>
                <p v-else-if="confirmPassword && passwordsMatch" class="text-xs text-green-600 mt-1.5 flex items-center">
                  <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Password cocok
                </p>
              </div>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="!canSubmit"
                class="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center"
              >
                <svg v-if="loading" class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loading ? 'Menyimpan...' : 'Simpan Password Baru' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
