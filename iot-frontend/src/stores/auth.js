import { defineStore } from 'pinia'
import api from '@/services/api'
import { TOKEN_KEY, USER_KEY } from '@/services/config'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: readUser(),
    token: localStorage.getItem(TOKEN_KEY)
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user)
  },

  actions: {
    async login(username, password) {
      const res = await api.login({ username, password })
      this.user = res.user
      this.token = res.token ?? null
      localStorage.setItem(USER_KEY, JSON.stringify(res.user))
      if (res.token) localStorage.setItem(TOKEN_KEY, res.token)
      return res
    },

    async logout() {
      try {
        await api.logout()
      } catch {
        // Frontend luôn xoá phiên cục bộ kể cả khi gọi API thất bại
      }
      this.clear()
    },

    clear() {
      this.user = null
      this.token = null
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
    }
  }
})
