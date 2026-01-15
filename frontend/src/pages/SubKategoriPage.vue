<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const subKategori = ref(null)
const loading = ref(true)
const error = ref(null)
const accessStatus = ref({
  canAccessJitu: false,
  canAccessDocheck: false,
  jituReason: null,
  docheckReason: null,
  latestTestSession: null,
  jituScheduleInfo: null,
  docheckPublishInfo: null
})

const modulGradients = {
  'KUPAS_TUNTAS': 'from-violet-500 to-purple-600',
  'JITU': 'from-blue-500 to-indigo-600',
  'DO_CHECK': 'from-teal-500 to-cyan-600',
  'REKAPIN': 'from-amber-500 to-orange-600'
}

const modulIcons = {
  'KUPAS_TUNTAS': `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>`,
  'JITU': `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>`,
  'DO_CHECK': `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>`,
  'REKAPIN': `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>`
}

const modulDescriptions = {
  'KUPAS_TUNTAS': 'Pelajari materi untuk mempersiapkan quiz',
  'JITU': 'Kerjakan soal-soal quiz untuk menguji pemahaman',
  'DO_CHECK': 'Lihat koreksi dan pembahasan jawaban quiz',
  'REKAPIN': 'Lihat rekap progress dan hasil pembelajaran'
}

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [subKategoriRes, jituAccess, docheckAccess] = await Promise.all([
      api.get(`/kategori/sub-kategori/${route.params.subKategoriId}`),
      api.get(`/materi/can-access-jitu/${route.params.subKategoriId}`),
      api.get(`/materi/can-access-docheck/${route.params.subKategoriId}`)
    ])

    subKategori.value = subKategoriRes.data

    // Sort moduls by urutan
    if (subKategori.value.moduls) {
      subKategori.value.moduls.sort((a, b) => a.urutan - b.urutan)
    }

    accessStatus.value = {
      canAccessJitu: jituAccess.data.canAccess,
      jituReason: jituAccess.data.reason,
      canAccessDocheck: docheckAccess.data.canAccess,
      docheckReason: docheckAccess.data.reason,
      latestTestSession: docheckAccess.data.testSessionId || null,
      jituScheduleInfo: jituAccess.data.scheduleInfo || null,
      docheckPublishInfo: docheckAccess.data.publishInfo || null
    }
  } catch (err) {
    error.value = 'Gagal memuat data'
    console.error(err)
  } finally {
    loading.value = false
  }
}

function goToModul(modul) {
  if (modul.tipe === 'KUPAS_TUNTAS') {
    router.push(`/materi/${modul.id}`)
  } else if (modul.tipe === 'JITU') {
    if (!accessStatus.value.canAccessJitu) {
      alert(accessStatus.value.jituReason || 'Anda belum dapat mengakses quiz')
      return
    }
    router.push(`/modul/${modul.id}`)
  } else if (modul.tipe === 'DO_CHECK') {
    if (!accessStatus.value.canAccessDocheck) {
      alert(accessStatus.value.docheckReason || 'Anda belum dapat mengakses koreksi')
      return
    }
    if (accessStatus.value.latestTestSession) {
      router.push(`/docheck/${accessStatus.value.latestTestSession}`)
    }
  } else if (modul.tipe === 'REKAPIN') {
    router.push(`/rekapin/${route.params.subKategoriId}`)
  }
}

function canAccessModul(modul) {
  if (modul.tipe === 'KUPAS_TUNTAS') return true
  if (modul.tipe === 'JITU') return accessStatus.value.canAccessJitu
  if (modul.tipe === 'DO_CHECK') return accessStatus.value.canAccessDocheck
  if (modul.tipe === 'REKAPIN') return true
  return false
}

function getModulStatus(modul) {
  if (modul.tipe === 'KUPAS_TUNTAS') return 'Baca Materi'
  if (modul.tipe === 'JITU') {
    const scheduleInfo = accessStatus.value.jituScheduleInfo
    if (scheduleInfo?.status === 'belum_mulai') return 'Belum Dibuka'
    if (scheduleInfo?.status === 'sudah_selesai') return 'Waktu Habis'
    if (!accessStatus.value.canAccessJitu) return 'Baca materi dulu'
    return 'Mulai Quiz'
  }
  if (modul.tipe === 'DO_CHECK') {
    const publishInfo = accessStatus.value.docheckPublishInfo
    if (publishInfo?.status === 'belum_publish') return 'Belum Tersedia'
    if (!accessStatus.value.canAccessDocheck) return 'Kerjakan quiz dulu'
    return 'Lihat Koreksi'
  }
  if (modul.tipe === 'REKAPIN') return 'Lihat Rekap'
  return 'Masuk'
}

function formatScheduleDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getScheduleLabel(modul) {
  if (modul.tipe === 'JITU') {
    const scheduleInfo = accessStatus.value.jituScheduleInfo
    if (!scheduleInfo?.isScheduled) return null
    if (scheduleInfo.status === 'belum_mulai') {
      return `Jadwal: ${formatScheduleDate(scheduleInfo.jadwalMulai)}`
    }
    if (scheduleInfo.status === 'dalam_jadwal') {
      return `Berakhir: ${formatScheduleDate(scheduleInfo.jadwalSelesai)}`
    }
    if (scheduleInfo.status === 'sudah_selesai') {
      return 'Waktu pengerjaan sudah berakhir'
    }
  }
  if (modul.tipe === 'DO_CHECK') {
    const publishInfo = accessStatus.value.docheckPublishInfo
    if (!publishInfo) return null
    if (publishInfo.status === 'belum_publish') {
      return `Tersedia: ${formatScheduleDate(publishInfo.publishDoCheck)}`
    }
  }
  return null
}

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}

function getGradient(tipe) {
  return modulGradients[tipe] || 'from-gray-500 to-gray-600'
}

function getIcon(tipe) {
  return modulIcons[tipe] || modulIcons['KUPAS_TUNTAS']
}

function getDescription(modul) {
  return modul.deskripsi || modulDescriptions[modul.tipe] || ''
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
      <!-- Hero Banner -->
      <section class="gradient-bpjs text-white py-16 relative overflow-hidden">
        <div class="absolute inset-0 opacity-10">
          <div class="absolute top-0 right-0 w-96 h-96 bg-white rounded-full transform translate-x-1/3 -translate-y-1/3"></div>
          <div class="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full transform -translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <!-- Breadcrumb -->
          <div class="flex items-center text-sm mb-6">
            <router-link to="/" class="text-white/70 hover:text-white transition-colors">
              Beranda
            </router-link>
            <svg class="w-4 h-4 mx-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <router-link :to="`/kategori/${subKategori.kategori.id}`" class="text-white/70 hover:text-white transition-colors">
              {{ subKategori.kategori.nama }}
            </router-link>
            <svg class="w-4 h-4 mx-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span class="text-white">{{ subKategori.nama }}</span>
          </div>

          <div class="flex flex-col md:flex-row md:items-center md:justify-between">
            <div class="text-center md:text-left">
              <div class="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-sm mb-4">
                {{ subKategori.kategori.nama }}
              </div>
              <h1 class="text-4xl md:text-5xl font-bold mb-4">{{ subKategori.nama }}</h1>
              <p class="text-lg opacity-80 max-w-2xl">{{ subKategori.deskripsi }}</p>
            </div>

            <!-- User Info -->
            <div v-if="authStore.isAuthenticated" class="mt-6 md:mt-0 bg-white/20 rounded-xl p-4 text-center md:text-right">
              <p class="text-sm opacity-80">Login sebagai:</p>
              <p class="font-bold text-lg">{{ authStore.user?.nama }}</p>
              <p class="text-sm opacity-80">{{ authStore.user?.posisi }}</p>
              <button @click="handleLogout" class="mt-2 text-sm underline opacity-80 hover:opacity-100">
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Learning Flow Guide -->
      <section class="py-6 bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-center space-x-2 md:space-x-4 text-sm overflow-x-auto">
            <div class="flex items-center text-violet-600 whitespace-nowrap">
              <span class="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold mr-2">1</span>
              <span class="font-medium">Baca Materi</span>
            </div>
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <div class="flex items-center whitespace-nowrap" :class="accessStatus.canAccessJitu ? 'text-blue-600' : 'text-gray-400'">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2" :class="accessStatus.canAccessJitu ? 'bg-blue-100' : 'bg-gray-100'">2</span>
              <span class="font-medium">Kerjakan Quiz</span>
            </div>
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <div class="flex items-center whitespace-nowrap" :class="accessStatus.canAccessDocheck ? 'text-teal-600' : 'text-gray-400'">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2" :class="accessStatus.canAccessDocheck ? 'bg-teal-100' : 'bg-gray-100'">3</span>
              <span class="font-medium">Lihat Koreksi</span>
            </div>
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <div class="flex items-center text-amber-600 whitespace-nowrap">
              <span class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold mr-2">4</span>
              <span class="font-medium">Rekap Progress</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Modules Section -->
      <section class="py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-10">
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Pilih Modul Pembelajaran</h2>
            <p class="text-gray-600">Ikuti urutan pembelajaran untuk hasil yang optimal</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              v-for="modul in subKategori.moduls"
              :key="modul.id"
              class="bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-300"
              :class="{
                'border-transparent hover:shadow-xl cursor-pointer': canAccessModul(modul),
                'border-gray-200 opacity-60': !canAccessModul(modul)
              }"
              @click="goToModul(modul)"
            >
              <!-- Module Header -->
              <div
                class="p-6 text-white"
                :class="`bg-gradient-to-br ${getGradient(modul.tipe)}`"
              >
                <div class="opacity-90" v-html="getIcon(modul.tipe)"></div>
                <h3 class="text-xl font-bold mt-4">{{ modul.nama }}</h3>
              </div>

              <!-- Module Content -->
              <div class="p-5">
                <p class="text-gray-600 text-sm mb-4">{{ getDescription(modul) }}</p>

                <!-- Module Info -->
                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <template v-if="modul.tipe === 'JITU'">
                    <span class="flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ modul.durasi }} menit
                    </span>
                    <span class="flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ modul._count?.soals || 0 }} soal
                    </span>
                  </template>
                  <template v-else-if="modul.tipe === 'KUPAS_TUNTAS'">
                    <span class="flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {{ modul._count?.materis || 0 }} materi
                    </span>
                  </template>
                  <template v-else>
                    <span></span>
                  </template>
                </div>

                <!-- Action Button -->
                <button
                  class="w-full py-3 rounded-xl font-semibold transition-all duration-300"
                  :class="{
                    'bg-gradient-to-r text-white shadow-lg hover:shadow-xl': canAccessModul(modul),
                    [getGradient(modul.tipe)]: canAccessModul(modul),
                    'bg-gray-100 text-gray-400 cursor-not-allowed': !canAccessModul(modul)
                  }"
                  :disabled="!canAccessModul(modul)"
                >
                  {{ getModulStatus(modul) }}
                </button>

                <!-- Schedule Info -->
                <div v-if="getScheduleLabel(modul)" class="mt-3 text-center">
                  <span
                    class="inline-flex items-center text-xs px-2 py-1 rounded-full"
                    :class="{
                      'bg-yellow-100 text-yellow-700': modul.tipe === 'JITU' && accessStatus.jituScheduleInfo?.status === 'belum_mulai',
                      'bg-green-100 text-green-700': modul.tipe === 'JITU' && accessStatus.jituScheduleInfo?.status === 'dalam_jadwal',
                      'bg-red-100 text-red-700': modul.tipe === 'JITU' && accessStatus.jituScheduleInfo?.status === 'sudah_selesai',
                      'bg-blue-100 text-blue-700': modul.tipe === 'DO_CHECK' && accessStatus.docheckPublishInfo?.status === 'belum_publish'
                    }"
                  >
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ getScheduleLabel(modul) }}
                  </span>
                </div>

                <!-- Lock indicator -->
                <div v-else-if="!canAccessModul(modul)" class="mt-3 text-center">
                  <span class="inline-flex items-center text-xs text-gray-400">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Selesaikan tahap sebelumnya
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="subKategori.moduls.length === 0" class="text-center py-20">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-1">Belum Ada Modul</h3>
            <p class="text-gray-500">Modul untuk sub kategori ini belum tersedia</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
