export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/realtime`

export const OFFLINE_AFTER_MS = Number(import.meta.env.VITE_OFFLINE_AFTER_SECONDS || 30) * 1000

export const ACTION_TIMEOUT_MS = Number(import.meta.env.VITE_ACTION_TIMEOUT_SECONDS || 10) * 1000

export const TOKEN_KEY = 'iot_token'
export const USER_KEY = 'iot_user'
