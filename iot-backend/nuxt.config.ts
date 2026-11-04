// Backend-only: chỉ dùng phần server (Nitro) của Nuxt — RESTful API /api/**, WebSocket /realtime, MQTT client.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  ssr: false,

  nitro: {
    experimental: { websocket: true }
  },

  // Mọi giá trị đều ghi đè được bằng biến môi trường NUXT_* (xem .env.example)
  runtimeConfig: {
    db: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'iot_monitor',
      timezone: '+07:00'
    },
    mqtt: {
      url: 'mqtt://127.0.0.1:8899',
      username: '',
      password: '',
      clientId: ''
    },
    jwt: {
      secret: 'doi-chuoi-bi-mat-nay-khi-trien-khai',
      expiresIn: '1d'
    },
    // ESP8266 không xác nhận lệnh trong khoảng này -> ActionHistory.status = 'fail'
    actionTimeoutSeconds: 15,
    // Danh sách origin được gọi API trực tiếp (không qua Vite proxy), phân tách bằng dấu phẩy
    corsOrigin: 'http://localhost:5173,http://127.0.0.1:5173'
  }
})
