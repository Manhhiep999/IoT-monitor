import { defineStore } from 'pinia'
import api from '@/services/api'
import * as realtime from '@/services/realtime'
import { errorMessage } from '@/services/http'
import { ACTION_TIMEOUT_MS, OFFLINE_AFTER_MS } from '@/services/config'
import { parseDateTime } from '@/utils/datetime'

export const SENSOR_TYPES = ['temperature', 'humidity', 'light']
const DAY_MS = 24 * 60 * 60 * 1000
const TREND_WINDOW_MS = 5 * 60 * 1000

let clockTimer = null
let unsubscribers = []
const actionTimers = new Map()

/** Trạng thái Dashboard: số liệu realtime, lịch sử 24h, thiết bị và lệnh đang chờ xác nhận. */
export const useMonitorStore = defineStore('monitor', {
  state: () => ({
    latest: { temperature: null, humidity: null, light: null },
    history: [],
    devices: [],
    loading: { latest: false, history: false, devices: false },
    errors: { latest: '', history: '', devices: '' },
    // deviceId -> { actionId, previousStatus }
    pending: {},
    actionError: '',
    exceptionAlert: null,
    offlineModalOpen: false,
    now: Date.now(),
    started: false
  }),

  getters: {
    lastUpdatedAt(state) {
      const times = SENSOR_TYPES.map((t) => parseDateTime(state.latest[t]?.updatedAt)).filter(Boolean)
      return times.length ? new Date(Math.max(...times)) : null
    },

    /** Mất kết nối khi WebSocket rớt hoặc quá lâu không có dữ liệu mới từ ESP8266 */
    isOffline() {
      if (!this.started) return false
      if (!realtime.connected.value) return true
      if (!this.lastUpdatedAt) return !this.loading.latest
      return this.now - this.lastUpdatedAt.getTime() > OFFLINE_AFTER_MS
    },

    /** Chênh lệch so với giá trị đo cách đây ~5 phút */
    trends(state) {
      const result = {}
      for (const type of SENSOR_TYPES) {
        const current = state.latest[type]
        const at = parseDateTime(current?.updatedAt)
        if (!current || !at) {
          result[type] = null
          continue
        }
        const target = at.getTime() - TREND_WINDOW_MS
        let base = null
        for (let i = state.history.length - 1; i >= 0; i--) {
          const row = state.history[i]
          if (row.sensorType === type && parseDateTime(row.timestamp)?.getTime() <= target) {
            base = row
            break
          }
        }
        result[type] = base ? current.value - base.value : null
      }
      return result
    }
  },

  actions: {
    async start() {
      if (this.started) return
      this.started = true
      clockTimer = setInterval(() => {
        const prevOffline = this.isOffline
        this.now = Date.now()
        // Tự động mở pop-up cảnh báo mất kết nối khi phát hiện offline
        if (!prevOffline && this.isOffline) {
          this.offlineModalOpen = true
        }
      }, 1000)
      unsubscribers = [
        realtime.on('sensor:update', (data) => this.applySensorUpdate(data)),
        realtime.on('device:status', (data) => this.applyDeviceStatus(data))
      ]
      realtime.connect()
      await Promise.all([this.fetchLatest(), this.fetchHistory(), this.fetchDevices()])
    },

    stop() {
      this.started = false
      clearInterval(clockTimer)
      unsubscribers.forEach((off) => off())
      unsubscribers = []
      actionTimers.forEach((t) => clearTimeout(t))
      actionTimers.clear()
      this.pending = {}
      this.exceptionAlert = null
      this.offlineModalOpen = false
      realtime.disconnect()
    },

    async fetchLatest() {
      this.loading.latest = true
      this.errors.latest = ''
      try {
        this.latest = { ...this.latest, ...(await api.getLatestSensors()) }
      } catch (e) {
        this.errors.latest = errorMessage(e, 'Không tải được số liệu mới nhất')
      } finally {
        this.loading.latest = false
      }
    },

    async fetchHistory() {
      this.loading.history = true
      this.errors.history = ''
      try {
        const res = await api.getSensorHistory24h()
        this.history = [...(res.data ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      } catch (e) {
        this.errors.history = errorMessage(e, 'Không tải được dữ liệu lịch sử')
      } finally {
        this.loading.history = false
      }
    },

    async fetchDevices() {
      this.loading.devices = true
      this.errors.devices = ''
      try {
        const res = await api.getDevices()
        this.devices = res.data ?? []
      } catch (e) {
        this.errors.devices = errorMessage(e, 'Không tải được danh sách thiết bị')
      } finally {
        this.loading.devices = false
      }
    },

    applySensorUpdate(data) {
      if (!data) return
      this.latest = { ...this.latest, ...data }
      for (const type of SENSOR_TYPES) {
        const s = data[type]
        if (s) this.history.push({ sensorType: type, value: s.value, unit: s.unit, timestamp: s.updatedAt })
      }
      const cutoff = Date.now() - DAY_MS
      const firstKept = this.history.findIndex((r) => parseDateTime(r.timestamp)?.getTime() >= cutoff)
      if (firstKept > 0) this.history.splice(0, firstKept)
    },

    applyDeviceStatus({ deviceId, status }) {
      const device = this.devices.find((d) => d.id === deviceId)
      if (device) device.currentStatus = status
      if (this.pending[deviceId]) {
        clearTimeout(actionTimers.get(deviceId))
        actionTimers.delete(deviceId)
        delete this.pending[deviceId]
      }
    },

    /** UC04: gửi lệnh ngược trạng thái hiện tại, chờ ESP8266 xác nhận qua device:status */
    async toggleDevice(device) {
      if (this.pending[device.id] || device.currentStatus === 'loading') return
      const previousStatus = device.currentStatus
      const action = previousStatus === 'on' ? 'OFF' : 'ON'
      this.actionError = ''
      device.currentStatus = 'loading'
      this.pending[device.id] = { actionId: null, previousStatus }

      try {
        const res = await api.sendDeviceAction(device.id, action)
        if (!this.pending[device.id]) return // đã được xác nhận trong lúc chờ response
        this.pending[device.id].actionId = res.actionId

        // Đối với LED 2 (mô phỏng cho người hướng dẫn xem): đặt timeout 3.5s để demo nhanh và trực quan
        const timeoutMs = device.id === 2 ? 3500 : ACTION_TIMEOUT_MS

        actionTimers.set(
          device.id,
          setTimeout(() => {
            if (!this.pending[device.id]) return
            delete this.pending[device.id]
            actionTimers.delete(device.id)
            // Rollback về trạng thái ban đầu (Fail-Safe)
            device.currentStatus = previousStatus
            const errMsg = `ESP8266 không phản hồi lệnh TURN ${action} (${res.actionId}). Trạng thái đèn đã tự động hoàn tác về ${previousStatus.toUpperCase()}.`
            this.actionError = errMsg

            // Cập nhật trạng thái trong lịch sử thao tác thành FAIL
            if (res.actionId) {
              api.updateActionStatus(res.actionId, 'fail').catch(() => {})
            }

            // Kích hoạt pop-up mô tả ngoại lệ UC04 cho người hướng dẫn xem
            this.exceptionAlert = {
              type: 'device_timeout',
              device: { ...device },
              action,
              actionId: res.actionId,
              previousStatus,
              message: errMsg
            }
          }, timeoutMs)
        )
      } catch (e) {
        delete this.pending[device.id]
        device.currentStatus = previousStatus
        this.actionError = errorMessage(e, 'Không gửi được lệnh điều khiển')
      }
    },

    closeExceptionModal() {
      this.exceptionAlert = null
      this.offlineModalOpen = false
    },

    openOfflineModal() {
      this.offlineModalOpen = true
    }
  }
})
