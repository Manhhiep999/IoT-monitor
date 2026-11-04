import http from './http'
import { USE_MOCK } from './config'

/**
 * Lớp gọi RESTful API tới Backend Nuxt.js (theo Chương 3 của báo cáo).
 * Khi VITE_USE_MOCK=true, mọi hàm trả về dữ liệu giả lập cùng định dạng.
 */
const real = {
  // UC01 — POST /api/auth/login
  async login(payload) {
    const { data } = await http.post('/auth/login', payload)
    return data
  },

  // POST /api/auth/logout
  async logout() {
    const { data } = await http.post('/auth/logout')
    return data
  },

  // UC02 — GET /api/sensors/latest
  async getLatestSensors() {
    const { data } = await http.get('/sensors/latest')
    return data
  },

  // UC05 — GET /api/sensors (danh mục loại cảm biến cho dropdown)
  async getSensors() {
    const { data } = await http.get('/sensors')
    return data
  },

  // UC03 / UC05 — GET /api/sensors/data?type&time&search&page&limit
  async getSensorData(params) {
    const { data } = await http.get('/sensors/data', { params })
    return data
  },

  // UC03 — dữ liệu 24 giờ cho biểu đồ "Historical Trends"
  async getSensorHistory24h() {
    const { data } = await http.get('/sensors/data', { params: { range: '24h', page: 1, limit: 5000 } })
    return data
  },

  // UC04 — GET /api/devices
  async getDevices() {
    const { data } = await http.get('/devices')
    return data
  },

  // GET /api/users
  async getUsers() {
    const { data } = await http.get('/users')
    return data
  },

  // UC04 — POST /api/devices/{deviceId}/actions
  async sendDeviceAction(deviceId, action) {
    const { data } = await http.post(`/devices/${deviceId}/actions`, { action })
    return data
  },

  // UC06 — GET /api/devices/actions?keyword&action&status&dateFrom&dateTo&page&limit
  async getActionHistory(params) {
    const { data } = await http.get('/devices/actions', { params })
    return data
  },

  // UC06 — GET /api/devices/actions/export (text/csv)
  async exportActionHistory(params) {
    const { data } = await http.get('/devices/actions/export', { params, responseType: 'blob' })
    return data
  },

  // Cập nhật trạng thái lệnh (fail khi timeout / ngoại lệ)
  async updateActionStatus(actionId, status) {
    const { data } = await http.patch(`/devices/actions/${actionId}`, { status })
    return data
  }
}

// Mock được import động để không đóng gói vào bản build dùng Backend thật
const loadMock = () => import('./mock/server')

const api = Object.fromEntries(
  Object.keys(real).map((name) => [
    name,
    USE_MOCK ? async (...args) => (await loadMock())[name](...args) : real[name]
  ])
)

export default api
