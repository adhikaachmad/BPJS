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
    <header class="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-3">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <router-link to="/" class="block">
              <img src="/images/Asset2.png" alt="BPJS Kesehatan" class="h-10 md:h-12 w-auto" />
            </router-link>
          </div>

          <!-- Navigation Desktop -->
          <nav class="hidden lg:flex items-center space-x-8">
            <button
              v-for="kategori in kategoris"
              :key="kategori.id"
              @click="goToKategori(kategori)"
              class="text-sm font-semibold text-gray-600 hover:text-green-600 transition-all duration-200 uppercase tracking-wider hover:tracking-widest"
            >
              {{ getKategoriConfig(kategori.nama).displayName }}
            </button>
            <router-link
              to="/"
              class="text-sm font-semibold text-gray-600 hover:text-green-600 transition-all duration-200 uppercase tracking-wider"
            >
              Beranda
            </router-link>
            <router-link
              to="/login"
              class="text-sm font-bold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-6 py-2.5 rounded-full transition-all duration-200 uppercase tracking-wider shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Masuk
            </router-link>
          </nav>

          <!-- Mobile menu button -->
          <div class="lg:hidden">
            <button
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
          <div v-if="mobileMenuOpen" class="lg:hidden py-4 border-t border-gray-100">
            <div class="flex flex-col space-y-2">
              <button
                v-for="kategori in kategoris"
                :key="kategori.id"
                @click="goToKategori(kategori); mobileMenuOpen = false"
                class="text-sm font-semibold text-gray-600 hover:text-green-600 hover:bg-green-50 px-4 py-3 rounded-lg transition-colors uppercase tracking-wide text-left"
              >
                {{ getKategoriConfig(kategori.nama).displayName }}
              </button>
              <router-link
                to="/"
                class="text-sm font-semibold text-gray-600 hover:text-green-600 hover:bg-green-50 px-4 py-3 rounded-lg transition-colors uppercase tracking-wide"
                @click="mobileMenuOpen = false"
              >
                Beranda
              </router-link>
              <router-link
                to="/login"
                class="text-sm font-bold text-white bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 rounded-lg transition-colors uppercase tracking-wide text-center mt-2"
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
    <section class="py-12 md:py-16 lg:py-20 -mt-4">
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
            v-for="(kategori, index) in kategoris"
            :key="kategori.id"
            :id="`kategori-${kategori.nama}`"
            class="group bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden transform hover:-translate-y-2 transition-all duration-300"
            :style="{ animationDelay: `${index * 100}ms` }"
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
