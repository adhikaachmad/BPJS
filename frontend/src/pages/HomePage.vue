<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const kategoris = ref([])
const loading = ref(true)
const error = ref(null)
const mobileMenuOpen = ref(false)

// Mapping kategori ke gambar dan display name
const kategoriConfig = {
  'TAD': {
    displayName: 'Tenaga Ahli Daya',
    image: '/images/Asset4.png'
  },
  'Pegawai': {
    displayName: 'Manajemen Pegawai',
    image: '/images/Asset5.png'
  },
  'Petugas Sentralisasi': {
    displayName: 'Layanan Terpusat',
    image: '/images/Asset6.png'
  }
}

onMounted(async () => {
  try {
    const response = await api.get('/kategori')
    kategoris.value = response.data
  } catch (err) {
    error.value = 'Gagal memuat data kategori'
    console.error(err)
  } finally {
    loading.value = false
  }
})

function goToKategori(kategori) {
  router.push(`/kategori/${kategori.id}`)
}

function getKategoriConfig(nama) {
  return kategoriConfig[nama] || { displayName: nama, image: '/images/Asset4.png' }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16 md:h-20">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <router-link to="/" class="block">
              <img src="/images/Asset2.png" alt="BPJS Kesehatan" class="h-9 md:h-11 w-auto" />
            </router-link>
          </div>

          <!-- Navigation Desktop -->
          <nav class="hidden lg:flex items-center space-x-1">
            <router-link
              to="/"
              class="px-4 py-2 text-sm font-medium rounded-lg text-green-600 bg-green-50"
            >
              Beranda
            </router-link>
            <button
              v-for="kategori in kategoris"
              :key="kategori.id"
              @click="goToKategori(kategori)"
              class="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all"
            >
              {{ getKategoriConfig(kategori.nama).displayName }}
            </button>
            <router-link
              to="/login"
              class="ml-4 px-6 py-2.5 text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
            >
              Masuk
            </router-link>
          </nav>

          <!-- Mobile menu button -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="lg:hidden p-2 rounded-lg text-gray-600 hover:text-green-600 hover:bg-gray-100 transition-colors"
          >
            <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Mobile Menu -->
        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="mobileMenuOpen" class="lg:hidden py-4 bg-white rounded-2xl shadow-xl mt-2 border border-gray-100">
            <div class="flex flex-col space-y-1 p-2">
              <router-link
                to="/"
                class="px-4 py-3 text-sm font-medium text-green-600 bg-green-50 rounded-lg"
                @click="mobileMenuOpen = false"
              >
                Beranda
              </router-link>
              <button
                v-for="kategori in kategoris"
                :key="kategori.id"
                @click="goToKategori(kategori); mobileMenuOpen = false"
                class="px-4 py-3 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors text-left"
              >
                {{ getKategoriConfig(kategori.nama).displayName }}
              </button>
              <router-link
                to="/login"
                class="mx-2 mt-2 px-4 py-3 text-sm font-semibold text-white bg-green-600 rounded-lg text-center"
                @click="mobileMenuOpen = false"
              >
                Masuk
              </router-link>
            </div>
          </div>
        </transition>
      </div>
    </header>

    <!-- Hero Section with Background -->
    <section class="relative overflow-hidden">
      <!-- Background Container -->
      <div class="w-full h-56 sm:h-64 md:h-72 lg:h-80 relative">
        <!-- Background Image -->
        <img
          src="/images/Asset3.png"
          alt="Background"
          class="w-full h-full object-cover object-bottom scale-105"
        />
        <!-- Overlay for better contrast -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
        <!-- Welcome Badge -->
        <div class="absolute inset-0 flex items-center justify-center p-4">
          <img
            src="/images/Asset1.png"
            alt="Welcome to SECURE"
            class="w-64 sm:w-80 md:w-96 lg:w-[420px] drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>
    </section>

    <!-- Categories Section -->
    <section id="kategori" class="py-12 md:py-16 lg:py-20 -mt-4">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-20">
          <div class="relative">
            <div class="animate-spin rounded-full h-14 w-14 border-4 border-green-200 border-t-green-600"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="h-6 w-6 bg-green-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-20">
          <div class="bg-red-50 rounded-2xl p-8 max-w-md mx-auto">
            <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-red-600 font-medium mb-4">{{ error }}</p>
            <button @click="$router.go(0)" class="px-6 py-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-semibold">
              Coba Lagi
            </button>
          </div>
        </div>

        <!-- Categories Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div
            v-for="kategori in kategoris"
            :key="kategori.id"
            class="group bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden transform hover:-translate-y-2 transition-all duration-300"
          >
            <!-- Card Image Container -->
            <div class="relative overflow-hidden">
              <div class="aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                  :src="getKategoriConfig(kategori.nama).image"
                  :alt="kategori.nama"
                  class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <!-- Subtle overlay on hover -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            <!-- Card Content -->
            <div class="p-6 text-center">
              <h3 class="text-xl font-bold text-gray-800 mb-5 group-hover:text-green-600 transition-colors">
                {{ getKategoriConfig(kategori.nama).displayName }}
              </h3>

              <!-- Masuk Button -->
              <button
                @click="goToKategori(kategori)"
                class="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 uppercase tracking-wide text-sm"
              >
                MASUK
                <svg class="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span class="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-4">
            Cara Kerja
          </span>
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">4 Langkah Mudah</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Ikuti langkah-langkah sederhana untuk memulai pembelajaran dan evaluasi Anda.
          </p>
        </div>

        <div class="grid md:grid-cols-4 gap-8">
          <div class="relative text-center group">
            <div class="relative z-10">
              <div class="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30 group-hover:scale-110 transition-transform">
                <span class="text-2xl font-bold text-white">1</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Baca Materi</h3>
              <p class="text-gray-600 text-sm">Pelajari materi yang tersedia dengan video dan dokumen</p>
            </div>
            <div class="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-violet-300 to-blue-300"></div>
          </div>

          <div class="relative text-center group">
            <div class="relative z-10">
              <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <span class="text-2xl font-bold text-white">2</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Kerjakan Test</h3>
              <p class="text-gray-600 text-sm">Jawab pertanyaan untuk mengukur pemahaman Anda</p>
            </div>
            <div class="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-blue-300 to-teal-300"></div>
          </div>

          <div class="relative text-center group">
            <div class="relative z-10">
              <div class="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-500/30 group-hover:scale-110 transition-transform">
                <span class="text-2xl font-bold text-white">3</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Lihat Pembahasan</h3>
              <p class="text-gray-600 text-sm">Pelajari jawaban yang benar dan penjelasannya</p>
            </div>
            <div class="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-teal-300 to-amber-300"></div>
          </div>

          <div class="relative text-center group">
            <div class="relative z-10">
              <div class="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <span class="text-2xl font-bold text-white">4</span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Dapatkan Hasil</h3>
              <p class="text-gray-600 text-sm">Lihat skor dan rekap hasil pembelajaran Anda</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section id="cta" class="py-24 bg-white relative overflow-hidden">
      <!-- Background Decoration -->
      <div class="absolute inset-0">
        <div class="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-green-50 to-transparent"></div>
        <div class="absolute bottom-0 left-0 w-1/3 h-full bg-gradient-to-r from-emerald-50 to-transparent"></div>
      </div>

      <div class="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-3xl p-12 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <!-- Background Effects -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div class="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div class="relative z-10">
            <div class="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm text-white mb-6">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Mulai Hari Ini
            </div>
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Siap untuk Memulai?</h2>
            <p class="text-lg text-white/80 max-w-2xl mx-auto mb-10">
              Login sekarang untuk mengakses materi pembelajaran lengkap dan mengerjakan evaluasi yang telah disiapkan untuk Anda.
            </p>
            <router-link
              to="/login"
              class="group inline-flex items-center justify-center px-12 py-4 text-lg font-semibold text-green-700 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Mulai Sekarang
              <svg class="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col md:flex-row items-center">
          <!-- Logo di kiri -->
          <div class="md:w-1/3 flex justify-center md:justify-start mb-4 md:mb-0">
            <img src="/images/Asset2.png" alt="BPJS Kesehatan" class="h-8" />
          </div>
          <!-- Copyright di tengah -->
          <div class="md:w-1/3 flex justify-center">
            <p class="text-gray-500 text-sm text-center">
              &copy; {{ new Date().getFullYear() }} BPJS Kesehatan. All rights reserved.
            </p>
          </div>
          <!-- Spacer di kanan untuk balance -->
          <div class="hidden md:block md:w-1/3"></div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* No custom styles needed */
</style>
