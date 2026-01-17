<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const subKategori = ref(null)
const activePeriode = ref(null)
const stepConfigs = ref([])
const loading = ref(true)
const error = ref(null)
const noPeriode = ref(false)

const steps = computed(() => {
  if (!activePeriode.value || stepConfigs.value.length === 0) return []

  const periode = activePeriode.value
  const progress = periode.userProgress || {}

  const getConfig = (id) => stepConfigs.value.find(s => s.id === id) || {}

  const materiConfig = getConfig('materi')
  const testConfig = getConfig('test')
  const docheckConfig = getConfig('docheck')
  const rekapConfig = getConfig('rekap')

  return [
    {
      id: 'materi',
      name: materiConfig.nama || 'Kupas Tuntas',
      description: materiConfig.deskripsi || 'Pelajari materi untuk mempersiapkan test',
      icon: materiConfig.icon || '',
      gradient: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
      count: periode.jumlahMateri,
      countLabel: 'materi',
      completed: progress.materiCompleted,
      canAccess: true,
      status: progress.materiCompleted ? 'Selesai' : 'Baca Materi',
      action: () => router.push(`/periode/${periode.id}/materi`)
    },
    {
      id: 'test',
      name: testConfig.nama || 'JITU',
      description: testConfig.deskripsi || 'Kerjakan soal-soal test untuk menguji pemahaman',
      icon: testConfig.icon || '',
      gradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      count: periode.jumlahSoal,
      countLabel: 'soal',
      completed: progress.testCompleted,
      canAccess: progress.materiCompleted && periode.status === 'aktif',
      status: getTestStatus(periode, progress),
      statusClass: getTestStatusClass(periode, progress),
      scheduleInfo: getScheduleInfo(periode),
      action: () => startTest()
    },
    {
      id: 'docheck',
      name: docheckConfig.nama || 'Do-Check',
      description: docheckConfig.deskripsi || 'Lihat koreksi dan pembahasan jawaban test',
      icon: docheckConfig.icon || '',
      gradient: 'from-teal-500 to-cyan-600',
      bgLight: 'bg-teal-50',
      textColor: 'text-teal-600',
      count: progress.hasilTest?.benar || 0,
      countLabel: 'benar',
      completed: progress.testCompleted && (periode.status === 'docheck' || periode.status === 'selesai'),
      canAccess: progress.testCompleted && (periode.status === 'docheck' || periode.status === 'selesai'),
      status: getDoCheckStatus(periode, progress),
      action: () => router.push(`/periode/${periode.id}/result`)
    },
    {
      id: 'rekap',
      name: rekapConfig.nama || 'Rekapin',
      description: rekapConfig.deskripsi || 'Lihat rekap progress dan hasil pembelajaran',
      icon: rekapConfig.icon || '',
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      count: progress.hasilTest ? Math.round(progress.hasilTest.skor) : 0,
      countLabel: 'skor',
      completed: progress.testCompleted,
      canAccess: progress.testCompleted,
      status: progress.testCompleted ? 'Lihat Rekap' : 'Selesaikan test',
      action: () => router.push(`/periode/${periode.id}/result`)
    }
  ]
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  error.value = null
  noPeriode.value = false

  try {
    const [stepConfigRes, subKategoriRes] = await Promise.all([
      api.get('/step-config'),
      api.get(`/kategori/sub-kategori/${route.params.subKategoriId}`)
    ])

    stepConfigs.value = stepConfigRes.data
    subKategori.value = subKategoriRes.data

    try {
      const periodeRes = await api.get('/periode/user/active')
      activePeriode.value = periodeRes.data
    } catch (err) {
      if (err.response?.status === 404) {
        noPeriode.value = true
      } else {
        throw err
      }
    }
  } catch (err) {
    error.value = 'Gagal memuat data'
    console.error(err)
  } finally {
    loading.value = false
  }
}

function getTestStatus(periode, progress) {
  if (progress.testCompleted) return 'Selesai'
  if (!progress.materiCompleted) return 'Baca materi dulu'
  if (periode.status === 'terjadwal') return 'Belum Dibuka'
  if (periode.status === 'docheck' || periode.status === 'selesai') return 'Waktu Habis'
  if (periode.status === 'aktif') return 'Mulai Test'
  return 'Tidak Tersedia'
}

function getTestStatusClass(periode, progress) {
  if (progress.testCompleted) return 'bg-green-100 text-green-700'
  if (periode.status === 'terjadwal') return 'bg-yellow-100 text-yellow-700'
  if (periode.status === 'aktif' && progress.materiCompleted) return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-500'
}

function getDoCheckStatus(periode, progress) {
  if (!progress.testCompleted) return 'Kerjakan test dulu'
  if (periode.status === 'aktif') return 'Belum Tersedia'
  if (periode.status === 'docheck' || periode.status === 'selesai') return 'Lihat Koreksi'
  return 'Tidak Tersedia'
}

function getScheduleInfo(periode) {
  if (periode.status === 'terjadwal' && periode.jamMulai) {
    return `Jadwal: ${formatDate(periode.jamMulai)}`
  }
  if (periode.status === 'aktif' && periode.jamBerakhir) {
    return `Berakhir: ${formatDate(periode.jamBerakhir)}`
  }
  return null
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function startTest() {
  if (!activePeriode.value) return

  const periode = activePeriode.value
  const progress = periode.userProgress || {}

  if (!progress.materiCompleted) {
    alert('Selesaikan materi terlebih dahulu')
    return
  }

  if (periode.status !== 'aktif') {
    alert(periode.status === 'terjadwal'
      ? 'Test belum dibuka, silakan tunggu jadwal'
      : 'Waktu pengerjaan test sudah berakhir')
    return
  }

  if (progress.testCompleted) {
    router.push(`/periode/${periode.id}/result`)
    return
  }

  router.push(`/periode/${periode.id}/test`)
}

function handleStepClick(step) {
  if (step.canAccess && step.action) {
    step.action()
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Memuat data...</p>
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
        <button @click="loadData" class="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
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
                  <span class="text-gray-900 font-medium">{{ subKategori?.nama }}</span>
                </nav>
              </div>
            </div>

            <!-- User Menu -->
            <div v-if="authStore.isAuthenticated" class="flex items-center space-x-4">
              <router-link
                to="/history"
                class="text-sm text-gray-600 hover:text-green-600 transition-colors flex items-center"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Riwayat
              </router-link>
              <div class="h-6 w-px bg-gray-200"></div>
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
          <div class="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div v-if="subKategori?.kategori" class="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm mb-4">
                {{ subKategori.kategori.nama }}
              </div>
              <h1 class="text-3xl md:text-4xl font-bold mb-2">{{ subKategori?.nama }}</h1>
              <p v-if="activePeriode" class="text-white/80">
                Periode: <span class="font-medium">{{ activePeriode.nama }}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- No Periode State -->
      <section v-if="noPeriode" class="py-20">
        <div class="max-w-md mx-auto px-4 text-center">
          <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-10">
            <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-3">Belum Ada Periode Aktif</h2>
            <p class="text-gray-600 mb-6">
              Saat ini belum ada periode test yang dijadwalkan untuk kategori Anda.
              Silakan tunggu pengumuman jadwal dari admin.
            </p>
            <button @click="loadData" class="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
              Refresh
            </button>
          </div>
        </div>
      </section>

      <!-- Learning Flow -->
      <template v-else-if="activePeriode">
        <!-- Progress Steps -->
        <section class="bg-white border-b border-gray-200 py-4">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-center space-x-2 md:space-x-4 overflow-x-auto">
              <template v-for="(step, index) in steps" :key="step.id">
                <div
                  class="flex items-center whitespace-nowrap text-sm"
                  :class="step.completed ? 'text-green-600' : step.canAccess ? 'text-blue-600' : 'text-gray-400'"
                >
                  <span
                    class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-2"
                    :class="step.completed ? 'bg-green-100' : step.canAccess ? 'bg-blue-100' : 'bg-gray-100'"
                  >
                    <svg v-if="step.completed" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else>{{ index + 1 }}</span>
                  </span>
                  <span class="font-medium">{{ step.name }}</span>
                </div>
                <svg v-if="index < steps.length - 1" class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </template>
            </div>
          </div>
        </section>

        <!-- Cards Section -->
        <section class="py-12">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-10">
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Pilih Modul Pembelajaran</h2>
              <p class="text-gray-600">Ikuti urutan pembelajaran untuk hasil yang optimal</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div
                v-for="step in steps"
                :key="step.id"
                class="bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300"
                :class="{
                  'border-gray-200 hover:border-green-200 hover:shadow-lg cursor-pointer': step.canAccess,
                  'border-gray-100 opacity-60': !step.canAccess
                }"
                @click="handleStepClick(step)"
              >
                <!-- Card Header -->
                <div class="p-5 text-white bg-gradient-to-br" :class="step.gradient">
                  <div class="opacity-90" v-html="step.icon"></div>
                  <h3 class="text-lg font-bold mt-3">{{ step.name }}</h3>
                </div>

                <!-- Card Content -->
                <div class="p-5">
                  <p class="text-gray-600 text-sm mb-4 line-clamp-2">{{ step.description }}</p>

                  <!-- Info -->
                  <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span class="flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {{ step.count }} {{ step.countLabel }}
                    </span>
                    <span v-if="step.completed" class="flex items-center text-green-600">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Selesai
                    </span>
                  </div>

                  <!-- Action Button -->
                  <button
                    class="w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-300"
                    :class="{
                      'bg-gradient-to-r text-white': step.canAccess,
                      [step.gradient]: step.canAccess,
                      'bg-gray-100 text-gray-400 cursor-not-allowed': !step.canAccess
                    }"
                    :disabled="!step.canAccess"
                  >
                    {{ step.status }}
                  </button>

                  <!-- Schedule Info -->
                  <div v-if="step.scheduleInfo" class="mt-3 text-center">
                    <span class="inline-flex items-center text-xs px-2 py-1 rounded-full" :class="step.statusClass">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ step.scheduleInfo }}
                    </span>
                  </div>

                  <!-- Lock indicator -->
                  <div v-else-if="!step.canAccess && !step.completed" class="mt-3 text-center">
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
          </div>
        </section>

        <!-- Result Summary (if completed) -->
        <section v-if="activePeriode.userProgress?.hasilTest" class="py-8 bg-white border-t border-gray-200">
          <div class="max-w-4xl mx-auto px-4">
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Hasil Test Anda</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-xl p-4 text-center shadow-sm">
                  <p class="text-3xl font-bold text-green-600">{{ activePeriode.userProgress.hasilTest.skor?.toFixed(0) }}</p>
                  <p class="text-sm text-gray-500">Skor</p>
                </div>
                <div class="bg-white rounded-xl p-4 text-center shadow-sm">
                  <p class="text-3xl font-bold text-green-600">{{ activePeriode.userProgress.hasilTest.benar }}</p>
                  <p class="text-sm text-gray-500">Benar</p>
                </div>
                <div class="bg-white rounded-xl p-4 text-center shadow-sm">
                  <p class="text-3xl font-bold text-red-600">{{ activePeriode.userProgress.hasilTest.salah }}</p>
                  <p class="text-sm text-gray-500">Salah</p>
                </div>
                <div class="bg-white rounded-xl p-4 text-center shadow-sm">
                  <p class="text-3xl font-bold text-gray-600">{{ activePeriode.userProgress.hasilTest.tidakDijawab }}</p>
                  <p class="text-sm text-gray-500">Tidak Dijawab</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>
