<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const sidebarOpen = ref(true)
const sidebarCollapsed = ref(false)

const menuItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard', description: 'Ringkasan & statistik' },
  { name: 'Kategori', path: '/admin/kategori', icon: 'folder', description: 'Kelola kategori' },
  { name: 'Modul', path: '/admin/modul', icon: 'collection', description: 'Kelola modul' },
  { name: 'Materi', path: '/admin/materi', icon: 'book', description: 'Konten KUPAS TUNTAS' },
  { name: 'Soal & Jadwal', path: '/admin/soal', icon: 'question', description: 'Pembuatan soal & penjadwalan' },
  { name: 'Users', path: '/admin/users', icon: 'users', description: 'Manajemen pengguna' },
  { name: 'Laporan', path: '/admin/reports', icon: 'chart', description: 'Hasil & export' }
]

const currentPage = computed(() => {
  return menuItems.find(item => route.path === item.path)
})

function isActive(path) {
  return route.path === path
}

async function handleLogout() {
  await authStore.logout()
  router.push('/admin/login')
}

function toggleSidebar() {
  if (window.innerWidth < 1024) {
    sidebarOpen.value = !sidebarOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar Overlay (Mobile) -->
    <div
      v-if="sidebarOpen && !sidebarCollapsed"
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-gray-900/50 z-20 lg:hidden"
    ></div>

    <!-- Sidebar -->
    <aside
      class="fixed lg:static inset-y-0 left-0 z-30 flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white transition-all duration-300 ease-in-out"
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        sidebarCollapsed ? 'w-20' : 'w-72'
      ]"
    >
      <!-- Logo Section -->
      <div class="p-5 border-b border-white/10">
        <div class="flex items-center" :class="sidebarCollapsed ? 'justify-center' : 'space-x-3'">
          <div class="w-11 h-11 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-xl flex items-center justify-center shadow-lg shadow-bpjs-500/30 flex-shrink-0">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div v-if="!sidebarCollapsed" class="overflow-hidden">
            <h1 class="font-bold text-lg leading-tight">Admin Panel</h1>
            <p class="text-xs text-gray-400">BPJS Kesehatan</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <div v-if="!sidebarCollapsed" class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Menu Utama
        </div>
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative"
          :class="[
            isActive(item.path)
              ? 'bg-gradient-to-r from-bpjs-500 to-bpjs-600 text-white shadow-lg shadow-bpjs-500/30'
              : 'text-gray-400 hover:bg-white/5 hover:text-white',
            sidebarCollapsed ? 'justify-center' : 'space-x-3'
          ]"
        >
          <!-- Dashboard Icon -->
          <svg v-if="item.icon === 'dashboard'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <!-- Folder Icon -->
          <svg v-else-if="item.icon === 'folder'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <!-- Collection Icon -->
          <svg v-else-if="item.icon === 'collection'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <!-- Book Icon -->
          <svg v-else-if="item.icon === 'book'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <!-- Question Icon -->
          <svg v-else-if="item.icon === 'question'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <!-- Calendar Icon -->
          <svg v-else-if="item.icon === 'calendar'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <!-- Users Icon -->
          <svg v-else-if="item.icon === 'users'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <!-- Chart Icon -->
          <svg v-else-if="item.icon === 'chart'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>

          <div v-if="!sidebarCollapsed" class="flex-1 min-w-0">
            <span class="font-medium">{{ item.name }}</span>
            <p v-if="!isActive(item.path)" class="text-xs text-gray-500 truncate group-hover:text-gray-400">
              {{ item.description }}
            </p>
          </div>

          <!-- Tooltip for collapsed sidebar -->
          <div
            v-if="sidebarCollapsed"
            class="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50"
          >
            {{ item.name }}
          </div>
        </router-link>
      </nav>

      <!-- User Section -->
      <div class="p-4 border-t border-white/10">
        <div
          class="flex items-center p-3 rounded-xl bg-white/5"
          :class="sidebarCollapsed ? 'justify-center' : 'space-x-3'"
        >
          <div class="w-10 h-10 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white font-bold">{{ authStore.user?.nama?.charAt(0) || 'A' }}</span>
          </div>
          <div v-if="!sidebarCollapsed" class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate">{{ authStore.user?.nama || 'Administrator' }}</p>
            <p class="text-xs text-gray-400">{{ authStore.user?.role || 'Admin' }}</p>
          </div>
        </div>

        <button
          @click="handleLogout"
          class="flex items-center w-full mt-3 px-4 py-3 text-gray-400 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all duration-200"
          :class="sidebarCollapsed ? 'justify-center' : 'space-x-3'"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span v-if="!sidebarCollapsed">Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-h-screen" :class="sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="flex items-center justify-between h-16 px-4 lg:px-6">
          <div class="flex items-center space-x-4">
            <!-- Mobile Menu Button -->
            <button
              @click="toggleSidebar"
              class="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <!-- Breadcrumb -->
            <div class="hidden sm:flex items-center space-x-2 text-sm">
              <router-link to="/admin/dashboard" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </router-link>
              <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="text-gray-700 font-medium">{{ currentPage?.name || 'Dashboard' }}</span>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <!-- Quick Actions -->
            <router-link
              to="/"
              target="_blank"
              class="hidden sm:flex items-center px-3 py-2 text-sm text-gray-600 hover:text-bpjs-600 hover:bg-bpjs-50 rounded-xl transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Lihat Website
            </router-link>

            <!-- User Dropdown -->
            <div class="flex items-center space-x-3 pl-3 border-l border-gray-200">
              <div class="hidden sm:block text-right">
                <p class="text-sm font-medium text-gray-700">{{ authStore.user?.nama }}</p>
                <p class="text-xs text-gray-500">Administrator</p>
              </div>
              <div class="w-10 h-10 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center shadow-md">
                <span class="text-white font-bold">{{ authStore.user?.nama?.charAt(0) || 'A' }}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto bg-gray-50">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="bg-white border-t border-gray-200 py-4 px-6">
        <div class="flex items-center justify-between text-sm text-gray-500">
          <span>Sistem Kuesioner BPJS Kesehatan</span>
          <span>v1.0.0</span>
        </div>
      </footer>
    </div>
  </div>
</template>
