import { ref } from 'vue'
import { USE_MOCK, WS_URL, TOKEN_KEY } from './config'

/**
 * Kênh cập nhật thời gian thực ws://<host>/realtime.
 * Bản tin dạng { "event": "sensor:update" | "device:status", "data": {...} }.
 * Tự kết nối lại (backoff) khi mất kết nối.
 */
const listeners = new Map()
export const connected = ref(false)

let socket = null
let retry = 0
let retryTimer = null
let stopped = true
let mockUnsubs = []

function dispatch(event, data) {
  listeners.get(event)?.forEach((cb) => cb(data))
}

export function on(event, cb) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(cb)
  return () => listeners.get(event)?.delete(cb)
}

function openSocket() {
  const token = localStorage.getItem(TOKEN_KEY)
  const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL
  socket = new WebSocket(url)

  socket.onopen = () => {
    retry = 0
    connected.value = true
  }
  socket.onmessage = (msg) => {
    try {
      const { event, data } = JSON.parse(msg.data)
      if (event) dispatch(event, data)
    } catch {
      // bỏ qua bản tin không phải JSON
    }
  }
  socket.onclose = () => {
    connected.value = false
    socket = null
    if (stopped) return
    const wait = Math.min(30000, 1000 * 2 ** retry++)
    retryTimer = setTimeout(openSocket, wait)
  }
  socket.onerror = () => socket?.close()
}

export async function connect() {
  if (!stopped) return
  stopped = false
  if (USE_MOCK) {
    const { onMockEvent } = await import('./mock/bus')
    mockUnsubs = ['sensor:update', 'device:status'].map((ev) => onMockEvent(ev, (d) => dispatch(ev, d)))
    connected.value = true
    return
  }
  openSocket()
}

export function disconnect() {
  stopped = true
  clearTimeout(retryTimer)
  mockUnsubs.forEach((off) => off())
  mockUnsubs = []
  socket?.close()
  connected.value = false
}
