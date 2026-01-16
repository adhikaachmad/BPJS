<script setup>
import { ref, onMounted, computed, watch, shallowRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js'

// ECharts for Indonesia Map
import * as echarts from 'echarts/core'
import { MapChart } from 'echarts/charts'
import { TooltipComponent, VisualMapComponent, GeoComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import indonesiaGeoJson from '@/assets/geo/indonesia.json'

// Register ECharts components
echarts.use([MapChart, TooltipComponent, VisualMapComponent, GeoComponent, CanvasRenderer])

// Register Indonesia map
echarts.registerMap('Indonesia', indonesiaGeoJson)

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler
)

const authStore = useAuthStore()

// Data
const stats = ref(null)
const charts = ref(null)
const recentTests = ref([])
const usersWithProgress = ref([])
const loading = ref(true)

// Daftar Provinsi Indonesia
const provinsiList = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi',
  'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Kepulauan Bangka Belitung',
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Daerah Istimewa Yogyakarta',
  'Jawa Timur', 'Banten', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur',
  'Kalimantan Utara', 'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan',
  'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara',
  'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya'
]

// Filters
const filters = ref({
  dateFrom: '',
  dateTo: '',
  kepwil: '',
  kcKabupaten: '',
  posisi: ''
})

// Filter options (derived from data)
const kcKabupatenList = computed(() => {
  const cabangSet = new Set()
  usersWithProgress.value.forEach(u => {
    if (u.kcKabupaten) cabangSet.add(u.kcKabupaten)
  })
  return Array.from(cabangSet).sort()
})

const posisiList = computed(() => {
  const posisiSet = new Set()
  usersWithProgress.value.forEach(u => {
    if (u.posisi) posisiSet.add(u.posisi)
  })
  return Array.from(posisiSet).sort()
})

// Pagination & Search for users table
const userSearch = ref('')
const userPage = ref(1)
const usersPerPage = 10

onMounted(async () => {
  await fetchDashboardData()
})

async function fetchDashboardData() {
  loading.value = true
  try {
    const response = await api.get('/admin/dashboard')
    stats.value = response.data.stats
    charts.value = response.data.charts
    recentTests.value = response.data.recentTests
    usersWithProgress.value = response.data.usersWithProgress
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = {
    dateFrom: '',
    dateTo: '',
    kepwil: '',
    kcKabupaten: '',
    posisi: ''
  }
  userPage.value = 1
}

// Filtered users based on all filters
const filteredUsers = computed(() => {
  let result = usersWithProgress.value

  // Filter by Kepwil (Kantor Wilayah)
  if (filters.value.kepwil) {
    result = result.filter(u => u.kepwil === filters.value.kepwil)
  }

  // Filter by KC Kabupaten (Kantor Cabang)
  if (filters.value.kcKabupaten) {
    result = result.filter(u => u.kcKabupaten === filters.value.kcKabupaten)
  }

  // Filter by Posisi
  if (filters.value.posisi) {
    result = result.filter(u => u.posisi === filters.value.posisi)
  }

  // Filter by search
  if (userSearch.value) {
    const search = userSearch.value.toLowerCase()
    result = result.filter(u =>
      u.nama.toLowerCase().includes(search) ||
      u.npp.toLowerCase().includes(search) ||
      (u.kepwil && u.kepwil.toLowerCase().includes(search))
    )
  }

  return result
})

// Filtered tests based on date filters
const filteredTests = computed(() => {
  let result = recentTests.value

  if (filters.value.dateFrom) {
    const fromDate = new Date(filters.value.dateFrom)
    result = result.filter(t => new Date(t.endTime) >= fromDate)
  }

  if (filters.value.dateTo) {
    const toDate = new Date(filters.value.dateTo)
    toDate.setHours(23, 59, 59)
    result = result.filter(t => new Date(t.endTime) <= toDate)
  }

  return result
})

// Stats computed from filtered data
const filteredStats = computed(() => {
  const users = filteredUsers.value
  const total = users.length
  const materiDone = users.filter(u => u.materiCompleted).length
  const testDone = users.filter(u => u.testCompleted).length
  const scores = users.filter(u => u.testScore !== null).map(u => u.testScore)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  return {
    totalUsers: total,
    materiCompleted: materiDone,
    testCompleted: testDone,
    averageScore: avgScore,
    materiRate: total > 0 ? ((materiDone / total) * 100).toFixed(1) : 0,
    testRate: total > 0 ? ((testDone / total) * 100).toFixed(1) : 0
  }
})

// Paginated users
const paginatedUsers = computed(() => {
  const start = (userPage.value - 1) * usersPerPage
  const end = start + usersPerPage
  return filteredUsers.value.slice(start, end)
})

// Total pages
const totalUserPages = computed(() => {
  return Math.ceil(filteredUsers.value.length / usersPerPage)
})

// Reset page when filters change
watch([filters, userSearch], () => {
  userPage.value = 1
}, { deep: true })

// Score Distribution Chart
const scoreDistributionData = computed(() => {
  const users = filteredUsers.value.filter(u => u.testScore !== null)
  const distribution = {
    'Kurang (0-40)': users.filter(u => u.testScore <= 40).length,
    'Cukup (41-60)': users.filter(u => u.testScore > 40 && u.testScore <= 60).length,
    'Baik (61-80)': users.filter(u => u.testScore > 60 && u.testScore <= 80).length,
    'Sangat Baik (81-100)': users.filter(u => u.testScore > 80).length
  }

  return {
    labels: Object.keys(distribution),
    datasets: [{
      data: Object.values(distribution),
      backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
      borderWidth: 0
    }]
  }
})

// Users by Position Chart
const usersByPositionData = computed(() => {
  const positionCount = {}
  filteredUsers.value.forEach(u => {
    const pos = u.posisi || 'Lainnya'
    positionCount[pos] = (positionCount[pos] || 0) + 1
  })

  const sorted = Object.entries(positionCount).sort((a, b) => b[1] - a[1])

  return {
    labels: sorted.map(s => s[0]),
    datasets: [{
      label: 'Jumlah User',
      data: sorted.map(s => s[1]),
      backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#f97316'],
      borderRadius: 8
    }]
  }
})

// Progress by Province Chart
const progressByProvinceData = computed(() => {
  const provinceStats = {}

  filteredUsers.value.forEach(u => {
    const prov = u.kepwil || 'Tidak Diketahui'
    if (!provinceStats[prov]) {
      provinceStats[prov] = { total: 0, materi: 0, test: 0 }
    }
    provinceStats[prov].total++
    if (u.materiCompleted) provinceStats[prov].materi++
    if (u.testCompleted) provinceStats[prov].test++
  })

  // Sort by total users and take top 10
  const sorted = Object.entries(provinceStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)

  return {
    labels: sorted.map(s => s[0]),
    datasets: [
      {
        label: 'Selesai Materi',
        data: sorted.map(s => s[1].materi),
        backgroundColor: '#8b5cf6',
        borderRadius: 4
      },
      {
        label: 'Selesai Test',
        data: sorted.map(s => s[1].test),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }
    ]
  }
})

// Chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { padding: 20, usePointStyle: true }
    }
  }
}

const barChartOptions = {
  ...chartOptions,
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } }
  }
}

function getScoreColor(skor) {
  if (skor >= 80) return 'text-emerald-600'
  if (skor >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreBg(skor) {
  if (skor >= 80) return 'bg-emerald-50'
  if (skor >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
})

// Check if any filter is active
const hasActiveFilters = computed(() => {
  return filters.value.dateFrom || filters.value.dateTo ||
    filters.value.kepwil || filters.value.kcKabupaten || filters.value.posisi
})

// Province name mapping (Database name -> GeoJSON name)
const provinceNameMap = {
  'Aceh': 'DI. ACEH',
  'Sumatera Utara': 'SUMATERA UTARA',
  'Sumatera Barat': 'SUMATERA BARAT',
  'Riau': 'RIAU',
  'Kepulauan Riau': 'KEPULAUAN RIAU',
  'Jambi': 'JAMBI',
  'Sumatera Selatan': 'SUMATERA SELATAN',
  'Bengkulu': 'BENGKULU',
  'Lampung': 'LAMPUNG',
  'Kepulauan Bangka Belitung': 'BANGKA BELITUNG',
  'DKI Jakarta': 'DKI JAKARTA',
  'Jawa Barat': 'JAWA BARAT',
  'Jawa Tengah': 'JAWA TENGAH',
  'Daerah Istimewa Yogyakarta': 'DAERAH ISTIMEWA YOGYAKARTA',
  'Jawa Timur': 'JAWA TIMUR',
  'Banten': 'BANTEN',
  'Bali': 'BALI',
  'Nusa Tenggara Barat': 'NUSATENGGARA BARAT',
  'Nusa Tenggara Timur': 'NUSA TENGGARA TIMUR',
  'Kalimantan Barat': 'KALIMANTAN BARAT',
  'Kalimantan Tengah': 'KALIMANTAN TENGAH',
  'Kalimantan Selatan': 'KALIMANTAN SELATAN',
  'Kalimantan Timur': 'KALIMANTAN TIMUR',
  'Kalimantan Utara': 'KALIMANTAN UTARA',
  'Sulawesi Utara': 'SULAWESI UTARA',
  'Sulawesi Tengah': 'SULAWESI TENGAH',
  'Sulawesi Selatan': 'SULAWESI SELATAN',
  'Sulawesi Tenggara': 'SULAWESI TENGGARA',
  'Gorontalo': 'GORONTALO',
  'Sulawesi Barat': 'SULAWESI BARAT',
  'Maluku': 'MALUKU',
  'Maluku Utara': 'MALUKU UTARA',
  'Papua': 'PAPUA',
  'Papua Barat': 'PAPUA BARAT',
  'Papua Selatan': 'PAPUA', // Map to Papua (new province not in GeoJSON)
  'Papua Tengah': 'PAPUA',
  'Papua Pegunungan': 'PAPUA',
  'Papua Barat Daya': 'PAPUA BARAT'
}

// Reverse mapping (GeoJSON name -> Database name)
const geoJsonToDbName = {}
Object.entries(provinceNameMap).forEach(([db, geo]) => {
  if (!geoJsonToDbName[geo]) geoJsonToDbName[geo] = db
})

// Indonesia Map Data - organized by region
const indonesiaRegions = {
  'Sumatera': ['Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi', 'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Kepulauan Bangka Belitung'],
  'Jawa': ['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Daerah Istimewa Yogyakarta', 'Jawa Timur', 'Banten'],
  'Kalimantan': ['Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara'],
  'Sulawesi': ['Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat'],
  'Bali & Nusa Tenggara': ['Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur'],
  'Maluku': ['Maluku', 'Maluku Utara'],
  'Papua': ['Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya']
}

// Map data computed from users
const mapData = computed(() => {
  const provinceData = {}

  // Initialize all provinces
  provinsiList.forEach(prov => {
    provinceData[prov] = {
      name: prov,
      totalUsers: 0,
      materiCompleted: 0,
      testCompleted: 0,
      totalScore: 0,
      testedUsers: 0,
      avgScore: 0
    }
  })

  // Populate with user data
  usersWithProgress.value.forEach(user => {
    const prov = user.kepwil
    if (prov && provinceData[prov]) {
      provinceData[prov].totalUsers++
      if (user.materiCompleted) provinceData[prov].materiCompleted++
      if (user.testCompleted) provinceData[prov].testCompleted++
      if (user.testScore !== null) {
        provinceData[prov].totalScore += user.testScore
        provinceData[prov].testedUsers++
      }
    }
  })

  // Calculate averages
  Object.values(provinceData).forEach(data => {
    if (data.testedUsers > 0) {
      data.avgScore = data.totalScore / data.testedUsers
    }
  })

  return provinceData
})

// Get color based on score
function getMapColor(score, hasUsers) {
  if (!hasUsers) return 'bg-gray-100 text-gray-400'
  if (score >= 80) return 'bg-emerald-500 text-white'
  if (score >= 60) return 'bg-blue-500 text-white'
  if (score >= 40) return 'bg-amber-500 text-white'
  if (score > 0) return 'bg-red-500 text-white'
  return 'bg-gray-200 text-gray-600'
}

// Get hover color based on score
function getMapHoverColor(score, hasUsers) {
  if (!hasUsers) return 'hover:bg-gray-200'
  if (score >= 80) return 'hover:bg-emerald-600'
  if (score >= 60) return 'hover:bg-blue-600'
  if (score >= 40) return 'hover:bg-amber-600'
  if (score > 0) return 'hover:bg-red-600'
  return 'hover:bg-gray-300'
}

// Selected province for detail view
const selectedProvince = ref(null)

function selectProvince(prov) {
  if (selectedProvince.value === prov) {
    selectedProvince.value = null
  } else {
    selectedProvince.value = prov
  }
}

// Region stats
const regionStats = computed(() => {
  const stats = {}
  Object.entries(indonesiaRegions).forEach(([region, provinces]) => {
    let total = 0, tested = 0, totalScore = 0
    provinces.forEach(prov => {
      const data = mapData.value[prov]
      if (data) {
        total += data.totalUsers
        tested += data.testedUsers
        totalScore += data.totalScore
      }
    })
    stats[region] = {
      totalUsers: total,
      testedUsers: tested,
      avgScore: tested > 0 ? totalScore / tested : 0
    }
  })
  return stats
})

// ECharts Indonesia Map Options
const indonesiaMapOption = computed(() => {
  // Prepare data for ECharts map
  const mapSeriesData = []

  // Get all GeoJSON province names and aggregate data
  const geoProvinceData = {}

  Object.entries(mapData.value).forEach(([dbName, data]) => {
    const geoName = provinceNameMap[dbName]
    if (geoName) {
      if (!geoProvinceData[geoName]) {
        geoProvinceData[geoName] = { totalUsers: 0, testedUsers: 0, totalScore: 0, materiCompleted: 0, testCompleted: 0 }
      }
      geoProvinceData[geoName].totalUsers += data.totalUsers
      geoProvinceData[geoName].testedUsers += data.testedUsers
      geoProvinceData[geoName].totalScore += data.totalScore
      geoProvinceData[geoName].materiCompleted += data.materiCompleted
      geoProvinceData[geoName].testCompleted += data.testCompleted
    }
  })

  // Convert to ECharts format
  Object.entries(geoProvinceData).forEach(([geoName, data]) => {
    const avgScore = data.testedUsers > 0 ? data.totalScore / data.testedUsers : 0
    mapSeriesData.push({
      name: geoName,
      value: avgScore,
      totalUsers: data.totalUsers,
      testedUsers: data.testedUsers,
      materiCompleted: data.materiCompleted,
      testCompleted: data.testCompleted,
      avgScore: avgScore
    })
  })

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const data = params.data || {}
        const dbName = geoJsonToDbName[params.name] || params.name
        return `
          <div style="font-weight: bold; margin-bottom: 8px;">${dbName}</div>
          <div>Total User: <b>${data.totalUsers || 0}</b></div>
          <div>Materi Selesai: <b>${data.materiCompleted || 0}</b></div>
          <div>Test Selesai: <b>${data.testCompleted || 0}</b></div>
          <div>Rata-rata Nilai: <b>${(data.avgScore || 0).toFixed(1)}%</b></div>
        `
      }
    },
    visualMap: {
      min: 0,
      max: 100,
      left: 'left',
      top: 'bottom',
      text: ['Tinggi', 'Rendah'],
      calculable: true,
      inRange: {
        color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']
      }
    },
    series: [
      {
        name: 'Rata-rata Nilai',
        type: 'map',
        map: 'Indonesia',
        roam: true,
        zoom: 1.2,
        center: [118, -2],
        aspectScale: 0.85,
        nameProperty: 'Propinsi',
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold'
          },
          itemStyle: {
            areaColor: '#00A650',
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 10
          }
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1
        },
        label: {
          show: false
        },
        data: mapSeriesData
      }
    ]
  }
})

// Handle map click
function onMapClick(params) {
  if (params.data) {
    const dbName = geoJsonToDbName[params.name]
    if (dbName) {
      selectedProvince.value = dbName
    }
  }
}
</script>

<template>
  <AdminLayout>
    <div class="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl lg:text-3xl font-bold text-gray-900">
          {{ greeting }}, {{ authStore.user?.nama?.split(' ')[0] || 'Admin' }}
        </h1>
        <p class="text-gray-500 mt-1">Dashboard Analytics Sistem Kuesioner BPJS Kesehatan</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-bpjs-500 mb-4"></div>
          <p class="text-gray-500">Memuat data analytics...</p>
        </div>
      </div>

      <template v-else>
        <!-- Filters Card -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-gradient-to-br from-bpjs-500 to-bpjs-600 rounded-lg flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div>
                <h2 class="font-semibold text-gray-900">Filter Data</h2>
                <p class="text-xs text-gray-500">Sesuaikan tampilan analytics</p>
              </div>
            </div>
            <button
              v-if="hasActiveFilters"
              @click="resetFilters"
              class="text-sm text-bpjs-600 hover:text-bpjs-700 font-medium flex items-center"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filter
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Tanggal Dari -->
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Tanggal Ujian Dari</label>
              <input
                v-model="filters.dateFrom"
                type="date"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all"
              />
            </div>

            <!-- Tanggal Sampai -->
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Tanggal Ujian Sampai</label>
              <input
                v-model="filters.dateTo"
                type="date"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all"
              />
            </div>

            <!-- Kepwil (Kantor Wilayah) -->
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Kantor Wilayah (Kepwil)</label>
              <select
                v-model="filters.kepwil"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white"
              >
                <option value="">Semua Wilayah</option>
                <option v-for="prov in provinsiList" :key="prov" :value="prov">{{ prov }}</option>
              </select>
            </div>

            <!-- KC Kabupaten (Kantor Cabang) -->
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Kantor Cabang (KC)</label>
              <select
                v-model="filters.kcKabupaten"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white"
              >
                <option value="">Semua Cabang</option>
                <option v-for="cabang in kcKabupatenList" :key="cabang" :value="cabang">{{ cabang }}</option>
              </select>
            </div>

            <!-- Posisi -->
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Posisi</label>
              <select
                v-model="filters.posisi"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all bg-white"
              >
                <option value="">Semua Posisi</option>
                <option v-for="pos in posisiList" :key="pos" :value="pos">{{ pos }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Indonesia Map Section -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-3">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900">Peta Sebaran Data Indonesia</h2>
                <p class="text-sm text-gray-500">Hover untuk melihat detail provinsi (scroll/drag untuk zoom/pan)</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- ECharts Indonesia Map -->
            <div class="lg:col-span-2">
              <div class="bg-gray-50 rounded-xl p-2 h-[450px]">
                <v-chart
                  class="w-full h-full"
                  :option="indonesiaMapOption"
                  autoresize
                  @click="onMapClick"
                />
              </div>
            </div>

            <!-- Province Detail Panel -->
            <div class="lg:col-span-1">
              <div v-if="selectedProvince && mapData[selectedProvince]" class="bg-gradient-to-br from-bpjs-500 to-bpjs-600 rounded-xl p-5 text-white sticky top-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-bold text-lg">{{ selectedProvince }}</h3>
                  <button @click="selectedProvince = null" class="p-1 hover:bg-white/20 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div class="space-y-4">
                  <!-- Total Users -->
                  <div class="bg-white/10 rounded-lg p-3">
                    <p class="text-white/70 text-xs mb-1">Total User</p>
                    <p class="text-2xl font-bold">{{ mapData[selectedProvince].totalUsers }}</p>
                  </div>

                  <!-- Progress -->
                  <div class="grid grid-cols-2 gap-3">
                    <div class="bg-white/10 rounded-lg p-3">
                      <p class="text-white/70 text-xs mb-1">Materi Selesai</p>
                      <p class="text-xl font-bold">{{ mapData[selectedProvince].materiCompleted }}</p>
                      <p class="text-xs text-white/60">
                        {{ mapData[selectedProvince].totalUsers > 0 ? ((mapData[selectedProvince].materiCompleted / mapData[selectedProvince].totalUsers) * 100).toFixed(0) : 0 }}%
                      </p>
                    </div>
                    <div class="bg-white/10 rounded-lg p-3">
                      <p class="text-white/70 text-xs mb-1">Test Selesai</p>
                      <p class="text-xl font-bold">{{ mapData[selectedProvince].testCompleted }}</p>
                      <p class="text-xs text-white/60">
                        {{ mapData[selectedProvince].totalUsers > 0 ? ((mapData[selectedProvince].testCompleted / mapData[selectedProvince].totalUsers) * 100).toFixed(0) : 0 }}%
                      </p>
                    </div>
                  </div>

                  <!-- Average Score -->
                  <div class="bg-white/10 rounded-lg p-3">
                    <p class="text-white/70 text-xs mb-1">Rata-rata Nilai</p>
                    <div class="flex items-end justify-between">
                      <p class="text-3xl font-bold">{{ mapData[selectedProvince].avgScore.toFixed(1) }}%</p>
                      <span
                        :class="[
                          'px-2 py-1 rounded text-xs font-medium',
                          mapData[selectedProvince].avgScore >= 80 ? 'bg-emerald-400 text-emerald-900' :
                          mapData[selectedProvince].avgScore >= 60 ? 'bg-blue-400 text-blue-900' :
                          mapData[selectedProvince].avgScore >= 40 ? 'bg-amber-400 text-amber-900' :
                          'bg-red-400 text-red-900'
                        ]"
                      >
                        {{ mapData[selectedProvince].avgScore >= 80 ? 'Sangat Baik' :
                           mapData[selectedProvince].avgScore >= 60 ? 'Baik' :
                           mapData[selectedProvince].avgScore >= 40 ? 'Cukup' : 'Kurang' }}
                      </span>
                    </div>
                  </div>

                  <!-- Filter by this province button -->
                  <button
                    @click="filters.kepwil = selectedProvince; selectedProvince = null"
                    class="w-full py-2.5 bg-white text-bpjs-600 rounded-lg font-semibold text-sm hover:bg-white/90 transition-colors"
                  >
                    Filter Data Provinsi Ini
                  </button>
                </div>
              </div>

              <!-- Empty State when no province selected -->
              <div v-else class="bg-gray-50 rounded-xl p-6 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h4 class="font-medium text-gray-700 mb-2">Pilih Provinsi</h4>
                <p class="text-sm text-gray-500">Klik provinsi di peta untuk melihat detail statistik</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <!-- Total Users -->
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-gray-900">{{ filteredStats.totalUsers }}</p>
            <p class="text-sm text-gray-500 mt-1">Total User</p>
          </div>

          <!-- Materi Selesai -->
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <div class="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-gray-900">{{ filteredStats.materiCompleted }}</p>
            <p class="text-sm text-gray-500 mt-1">Materi Selesai ({{ filteredStats.materiRate }}%)</p>
          </div>

          <!-- Test Selesai -->
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-gray-900">{{ filteredStats.testCompleted }}</p>
            <p class="text-sm text-gray-500 mt-1">Test Selesai ({{ filteredStats.testRate }}%)</p>
          </div>

          <!-- Rata-rata Skor -->
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold" :class="getScoreColor(filteredStats.averageScore)">
              {{ filteredStats.averageScore.toFixed(1) }}%
            </p>
            <p class="text-sm text-gray-500 mt-1">Rata-rata Skor</p>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <!-- Score Distribution -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Distribusi Nilai</h3>
            <div class="h-64">
              <Doughnut :data="scoreDistributionData" :options="chartOptions" />
            </div>
          </div>

          <!-- Users by Position -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">User per Posisi</h3>
            <div class="h-64">
              <Bar :data="usersByPositionData" :options="barChartOptions" />
            </div>
          </div>

          <!-- Progress by Province -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Progress per Wilayah (Top 10)</h3>
            <div class="h-64">
              <Bar :data="progressByProvinceData" :options="barChartOptions" />
            </div>
          </div>
        </div>

        <!-- Progress Overview Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Learning Progress -->
          <div class="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
            <h3 class="text-lg font-semibold mb-4">Progress Pembelajaran</h3>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span>KUPAS TUNTAS Selesai</span>
                  <span class="font-semibold">{{ filteredStats.materiRate }}%</span>
                </div>
                <div class="w-full bg-white/30 rounded-full h-3">
                  <div class="bg-white rounded-full h-3 transition-all duration-500" :style="{ width: filteredStats.materiRate + '%' }"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span>JITU Test Selesai</span>
                  <span class="font-semibold">{{ filteredStats.testRate }}%</span>
                </div>
                <div class="w-full bg-white/30 rounded-full h-3">
                  <div class="bg-white rounded-full h-3 transition-all duration-500" :style="{ width: filteredStats.testRate + '%' }"></div>
                </div>
              </div>
            </div>
            <div class="mt-6 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-center">
              <div>
                <p class="text-2xl font-bold">{{ filteredStats.materiCompleted }}</p>
                <p class="text-sm text-white/80">Selesai Materi</p>
              </div>
              <div>
                <p class="text-2xl font-bold">{{ filteredStats.testCompleted }}</p>
                <p class="text-sm text-white/80">Selesai Test</p>
              </div>
            </div>
          </div>

          <!-- Score Summary -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Ringkasan Nilai</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-emerald-500 rounded-full mr-3"></div>
                  <span class="text-sm font-medium text-gray-700">Sangat Baik (81-100)</span>
                </div>
                <span class="text-lg font-bold text-emerald-600">
                  {{ filteredUsers.filter(u => u.testScore > 80).length }}
                </span>
              </div>
              <div class="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span class="text-sm font-medium text-gray-700">Baik (61-80)</span>
                </div>
                <span class="text-lg font-bold text-blue-600">
                  {{ filteredUsers.filter(u => u.testScore > 60 && u.testScore <= 80).length }}
                </span>
              </div>
              <div class="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-amber-500 rounded-full mr-3"></div>
                  <span class="text-sm font-medium text-gray-700">Cukup (41-60)</span>
                </div>
                <span class="text-lg font-bold text-amber-600">
                  {{ filteredUsers.filter(u => u.testScore > 40 && u.testScore <= 60).length }}
                </span>
              </div>
              <div class="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span class="text-sm font-medium text-gray-700">Kurang (0-40)</span>
                </div>
                <span class="text-lg font-bold text-red-600">
                  {{ filteredUsers.filter(u => u.testScore !== null && u.testScore <= 40).length }}
                </span>
              </div>
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div class="flex items-center">
                  <div class="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                  <span class="text-sm font-medium text-gray-700">Belum Test</span>
                </div>
                <span class="text-lg font-bold text-gray-600">
                  {{ filteredUsers.filter(u => u.testScore === null).length }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Data User</h3>
                <p class="text-sm text-gray-500 mt-0.5">
                  Menampilkan {{ paginatedUsers.length }} dari {{ filteredUsers.length }} user
                </p>
              </div>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  v-model="userSearch"
                  type="text"
                  placeholder="Cari nama, NPP..."
                  class="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-bpjs-500/20 focus:border-bpjs-500 transition-all w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Wilayah</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Posisi</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Materi</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Test</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Skor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="user in paginatedUsers" :key="user.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <div class="flex items-center">
                      <div class="w-9 h-9 bg-gradient-to-br from-bpjs-400 to-bpjs-600 rounded-full flex items-center justify-center mr-3">
                        <span class="text-white font-medium text-sm">{{ user.nama.charAt(0) }}</span>
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 text-sm">{{ user.nama }}</p>
                        <p class="text-xs text-gray-500">{{ user.npp }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-sm text-gray-900">{{ user.kepwil || '-' }}</p>
                    <p class="text-xs text-gray-500">{{ user.kcKabupaten || '' }}</p>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                      {{ user.posisi }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span v-if="user.materiCompleted" class="inline-flex items-center px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Selesai
                    </span>
                    <span v-else class="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                      Belum
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span v-if="user.testCompleted" class="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Selesai
                    </span>
                    <span v-else class="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                      Belum
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      v-if="user.testScore !== null"
                      class="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold"
                      :class="[getScoreBg(user.testScore), getScoreColor(user.testScore)]"
                    >
                      {{ user.testScore.toFixed(1) }}%
                    </span>
                    <span v-else class="text-gray-400 text-sm">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div v-if="paginatedUsers.length === 0" class="text-center py-12">
            <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p class="text-gray-500">Tidak ada user ditemukan</p>
            <p class="text-sm text-gray-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>

          <!-- Pagination -->
          <div v-if="totalUserPages > 1" class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p class="text-sm text-gray-500">
              Halaman {{ userPage }} dari {{ totalUserPages }}
            </p>
            <div class="flex items-center space-x-2">
              <button
                @click="userPage = 1"
                :disabled="userPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                @click="userPage--"
                :disabled="userPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span class="px-3 py-1.5 bg-bpjs-500 text-white rounded-lg text-sm font-medium min-w-[40px] text-center">
                {{ userPage }}
              </span>
              <button
                @click="userPage++"
                :disabled="userPage === totalUserPages"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                @click="userPage = totalUserPages"
                :disabled="userPage === totalUserPages"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>
