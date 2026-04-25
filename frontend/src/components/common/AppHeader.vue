<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const showHeader = computed(() => !route.meta.hideHeader)

// When authenticated, "Beranda" goes to user's sub-kategori page
const berandaLink = computed(() => {
  if (authStore.isAuthenticated && authStore.user?.subKategori?.id) {
    return `/sub-kategori/${authStore.user.subKategori.id}`
  }
  return '/'
})

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <header v-if="showHeader" class="bg-white shadow-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <router-link :to="berandaLink" class="flex items-center space-x-3">
          <div class="w-10 h-10 gradient-bpjs rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div class="hidden sm:block">
            <h1 class="text-lg font-bold text-bpjs-600">BPJS Kesehatan</h1>
            <p class="text-xs text-gray-500">Sistem Kuesioner</p>
          </div>
        </router-link>

        <!-- Navigation -->
        <nav class="flex items-center space-x-1 sm:space-x-3">
          <router-link
            :to="berandaLink"
            class="px-3 py-2 text-gray-600 hover:text-bpjs-600 hover:bg-bpjs-50 rounded-xl font-medium transition-all text-sm"
          >
            Beranda
          </router-link>

          <template v-if="authStore.isAuthenticated">
            <router-link
              to="/history"
              class="px-3 py-2 text-gray-600 hover:text-bpjs-600 hover:bg-bpjs-50 rounded-xl font-medium transition-all text-sm"
            >
              Riwayat
            </router-link>

            <router-link
              to="/profile"
              class="px-3 py-2 text-gray-600 hover:text-bpjs-600 hover:bg-bpjs-50 rounded-xl font-medium transition-all text-sm flex items-center"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profil
            </router-link>

            <div class="flex items-center ml-2 pl-3 border-l border-gray-200">
              <div class="w-8 h-8 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center mr-2">
                <span class="text-white font-bold text-sm">{{ authStore.user?.nama?.charAt(0) }}</span>
              </div>
              <div class="text-left hidden md:block mr-3">
                <p class="text-sm font-medium text-gray-900 leading-tight">{{ authStore.user?.nama }}</p>
                <p class="text-xs text-gray-500 leading-tight">{{ authStore.user?.npp }}</p>
              </div>
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
          </template>

          <template v-else>
            <router-link
              to="/login"
              class="btn-primary text-sm py-2 px-4"
            >
              Masuk
            </router-link>
          </template>
        </nav>
      </div>
    </div>
  </header>
</template>
