import axios from 'axios'
import { TOKEN_KEY } from './config'

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Hết phiên đăng nhập -> quay về trang Login
http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(error)
  }
)

export function errorMessage(error, fallback = 'Đã xảy ra lỗi, vui lòng thử lại') {
  return error?.response?.data?.message || error?.message || fallback
}

export default http
