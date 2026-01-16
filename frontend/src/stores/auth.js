import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const loading = ref(false)
  const error = ref(null)
  const initialized = ref(false)
  let initPromise = null

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(npp) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/auth/login', { npp })
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', response.data.token)
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'Login gagal'
      return false
    } finally {
      loading.value = false
    }
  }

  async function loginWithSubKategori(npp, password, slug) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post(`/auth/login/${slug}`, { npp, password })
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', response.data.token)
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'Login gagal'
      return false
    } finally {
      loading.value = false
    }
  }

  async function adminLogin(username, password) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/auth/admin/login', { username, password })
      token.value = response.data.token
      user.value = { ...response.data.admin, role: 'admin' }
      localStorage.setItem('token', response.data.token)
      return true
    } catch (err) {
      error.value = err.response?.data?.error || 'Login gagal'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      // Ignore logout errors
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('token')
    }
  }

  async function fetchUser() {
    if (!token.value) return

    try {
      const response = await api.get('/auth/me')
      user.value = response.data.user
      if (response.data.role === 'admin') {
        user.value.role = 'admin'
      }
    } catch (err) {
      token.value = null
      user.value = null
      localStorage.removeItem('token')
    }
  }

  async function verifyToken() {
    if (!token.value) {
      initialized.value = true
      return false
    }

    try {
      await api.get('/auth/verify')
      await fetchUser()
      initialized.value = true
      return true
    } catch (err) {
      token.value = null
      user.value = null
      localStorage.removeItem('token')
      initialized.value = true
      return false
    }
  }

  // Wait for initialization to complete
  async function waitForInit() {
    if (initialized.value) return
    if (initPromise) return initPromise
    return Promise.resolve()
  }

  // Initialize - check token on load
  if (token.value) {
    initPromise = verifyToken()
  } else {
    initialized.value = true
  }

  return {
    user,
    token,
    loading,
    error,
    initialized,
    isAuthenticated,
    isAdmin,
    login,
    loginWithSubKategori,
    adminLogin,
    logout,
    fetchUser,
    verifyToken,
    waitForInit,
    initPromise
  }
})
