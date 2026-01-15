<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-bpjs-500 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-gray-800 mb-2">Halaman Tidak Ditemukan</h2>
      <p class="text-gray-600 mb-8">Maaf, halaman yang Anda cari tidak tersedia</p>
      <router-link to="/" class="btn-primary">
        Kembali ke Beranda
      </router-link>
    </div>
  </div>
</template>
