<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showFooter = computed(() => !route.meta.hideFooter)
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer v-if="showFooter" class="bg-gray-900 text-white py-8 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Logo & Description -->
        <div>
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 gradient-bpjs rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 class="font-bold">BPJS Kesehatan</h3>
              <p class="text-sm text-gray-400">Sistem Kuesioner</p>
            </div>
          </div>
          <p class="text-gray-400 text-sm">
            Platform kuesioner digital untuk evaluasi dan pengembangan kompetensi pegawai BPJS Kesehatan.
          </p>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="font-semibold mb-4">Tautan Cepat</h4>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li>
              <router-link to="/" class="hover:text-bpjs-400 transition-colors">
                Beranda
              </router-link>
            </li>
            <li>
              <router-link to="/login" class="hover:text-bpjs-400 transition-colors">
                Masuk
              </router-link>
            </li>
            <li>
              <router-link to="/admin/login" class="hover:text-bpjs-400 transition-colors">
                Admin Panel
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="font-semibold mb-4">Kontak</h4>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li class="flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>info@bpjs-kesehatan.go.id</span>
            </li>
            <li class="flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>165</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
        <p>&copy; {{ currentYear }} BPJS Kesehatan. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>
