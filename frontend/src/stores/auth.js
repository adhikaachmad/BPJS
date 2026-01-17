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

  // Admin role helpers
  const adminRole = computed(() => user.value?.adminRole || null)
  const adminKepwil = computed(() => user.value?.kepwil || null)
  const isSuperAdmin = computed(() => adminRole.value === 'SUPER_ADMIN')
  const isAdminKP = computed(() => adminRole.value === 'ADMIN_KP')
  const isAdminKepwil = computed(() => adminRole.value === 'ADMIN_KEPWIL')
  const canAccessAllWilayah = computed(() => ['SUPER_ADMIN', 'ADMIN_KP'].includes(adminRole.value))
  const canManageContent = computed(() => ['SUPER_ADMIN', 'ADMIN_KP'].includes(adminRole.value))
  const canManageAdmin = computed(() => ['SUPER_ADMIN', 'ADMIN_KP'].includes(adminRole.value))
  const canManageAccess = computed(() => adminRole.value === 'SUPER_ADMIN')

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
      user.value = {
        ...response.data.admin,
        role: 'admin',
        adminRole: response.data.admin.role, // SUPER_ADMIN, ADMIN_KP, ADMIN_KEPWIL
        kepwil: response.data.admin.kepwil
      }
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
      if (response.data.role === 'admin') {
        // For admin, save adminRole before setting user
        const adminRole = response.data.user.role // SUPER_ADMIN, ADMIN_KP, ADMIN_KEPWIL
        const kepwil = response.data.user.kepwil
        user.value = {
          ...response.data.user,
          role: 'admin', // For isAdmin check compatibility
          adminRole: adminRole,
          kepwil: kepwil
        }
      } else {
        user.value = response.data.user
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
    // Admin role helpers
    adminRole,
    adminKepwil,
    isSuperAdmin,
    isAdminKP,
    isAdminKepwil,
    canAccessAllWilayah,
    canManageContent,
    canManageAdmin,
    canManageAccess,
    // Methods
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
