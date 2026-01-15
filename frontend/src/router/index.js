import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { hideHeader: true, hideFooter: true }
  },
  {
    path: '/kategori/:kategoriId',
    name: 'kategori',
    component: () => import('@/pages/KategoriPage.vue')
  },
  {
    path: '/sub-kategori/:subKategoriId',
    name: 'sub-kategori',
    component: () => import('@/pages/SubKategoriPage.vue'),
    meta: { requiresAuth: true, requiresSubKategoriMatch: true }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { hideHeader: true, hideFooter: true }
  },
  {
    path: '/login/:slug',
    name: 'sub-kategori-login',
    component: () => import('@/pages/SubKategoriLoginPage.vue'),
    meta: { hideHeader: true, hideFooter: true }
  },
  {
    path: '/modul/:modulId',
    name: 'modul-detail',
    component: () => import('@/pages/ModulDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/quiz/:sessionId',
    name: 'quiz',
    component: () => import('@/pages/QuizPage.vue'),
    meta: { requiresAuth: true, hideHeader: true, hideFooter: true }
  },
  {
    path: '/result/:sessionId',
    name: 'result',
    component: () => import('@/pages/ResultPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/materi/:modulId',
    name: 'materi',
    component: () => import('@/pages/MateriPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/docheck/:sessionId',
    name: 'docheck',
    component: () => import('@/pages/DoCheckPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rekapin/:subKategoriId',
    name: 'rekapin',
    component: () => import('@/pages/RekapinPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/pages/HistoryPage.vue'),
    meta: { requiresAuth: true }
  },
  // Admin routes
  {
    path: '/admin',
    name: 'admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/pages/admin/AdminLoginPage.vue'),
    meta: { hideHeader: true, hideFooter: true }
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('@/pages/admin/DashboardPage.vue'),
    meta: { requiresAdmin: true, hideHeader: true, hideFooter: true }
  },
  {
    path: '/admin/kategori',
    name: 'admin-kategori',
    component: () => import('@/pages/admin/KategoriManagePage.vue'),
    meta: { requiresAdmin: true, hideHeader: true, hideFooter: true }
  },
  {
    path: '/admin/modul',
    name: 'admin-modul',
    component: () => import('@/pages/admin/ModulManagePage.vue'),
    meta: { requiresAdmin: true, hideHeader: true, hideFooter: true }
  },
  {
    path: '/admin/soal',
    name: 'admin-soal',
    component: () => import('@/pages/admin/SoalManagePage.vue'),
    meta: { requiresAdmin: true, hideHeader: true, hideFooter: true }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/pages/admin/UserManagePage.vue'),
    meta: { requiresAdmin: true, hideHeader: true, hideFooter: true }
  },
  {
    path: '/admin/reports',
    name: 'admin-reports',
    component: () => import('@/pages/admin/ReportsPage.vue'),
    meta: { requiresAdmin: true, hideHeader: true, hideFooter: true }
  },
  {
    path: '/admin/materi',
    name: 'admin-materi',
    component: () => import('@/pages/admin/MateriManagePage.vue'),
    meta: { requiresAdmin: true, hideHeader: true, hideFooter: true }
  },
  // Access Denied page
  {
    path: '/access-denied',
    name: 'access-denied',
    component: () => import('@/pages/AccessDeniedPage.vue'),
    meta: { hideHeader: true, hideFooter: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth initialization to complete
  if (!authStore.initialized) {
    if (authStore.initPromise) {
      await authStore.initPromise
    }
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!authStore.token || !authStore.user) {
      return next({
        name: 'login'
      })
    }
  }

  // Check if route requires sub-kategori match
  if (to.meta.requiresSubKategoriMatch) {
    // Must be authenticated first
    if (!authStore.token || !authStore.user) {
      return next({ name: 'login' })
    }

    const userSubKategoriId = authStore.user?.subKategori?.id
    const routeSubKategoriId = parseInt(to.params.subKategoriId)

    console.log('Sub-kategori access check:', {
      userSubKategoriId,
      routeSubKategoriId,
      match: userSubKategoriId === routeSubKategoriId
    })

    // If user doesn't have subKategori or IDs don't match
    if (!userSubKategoriId || userSubKategoriId !== routeSubKategoriId) {
      console.log('Access denied - redirecting to access-denied page')
      return next({
        name: 'access-denied',
        query: {
          from: to.fullPath,
          userSubKategori: authStore.user?.subKategori?.nama || authStore.user?.posisi,
          userSubKategoriId: userSubKategoriId
        }
      })
    }
  }

  // Check if route requires admin
  if (to.meta.requiresAdmin) {
    if (!authStore.isAdmin) {
      return next({ name: 'admin-login' })
    }
  }

  next()
})

export default router
