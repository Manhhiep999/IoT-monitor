<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  open: Boolean,
  type: {
    type: String,
    default: 'device_timeout' // 'device_timeout' | 'offline'
  },
  data: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close'])
const router = useRouter()

const isDeviceTimeout = computed(() => props.type === 'device_timeout')

function goToHistory() {
  emit('close')
  router.push({ name: 'action-history' })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="isDeviceTimeout ? 'ex-title-dev' : 'ex-title-off'"
      >
        <!-- Nút đóng góc trên -->
        <button type="button" class="modal-close" aria-label="Đóng" @click="emit('close')">
          ×
        </button>

        <!-- Lệnh bật/tắt quá thời gian chờ mà ESP32 không xác nhận -->
        <template v-if="isDeviceTimeout">
          <div class="modal-head modal-head--warning">
            <div class="modal-icon modal-icon--warning" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 id="ex-title-dev" class="modal-title">Không nhận được phản hồi từ ESP32</h2>
              <p class="modal-subtitle">Lệnh đã bị đánh dấu FAIL, công tắc trở về trạng thái cũ</p>
            </div>
          </div>

          <div class="modal-body">
            <!-- Thông tin chi tiết sự cố -->
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Thiết bị chấp hành</span>
                <span class="info-value font-semibold">{{ data.device?.name || '--' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Lệnh đã phát</span>
                <span class="info-value badge badge--action">TURN {{ data.action || 'ON' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Mã thao tác (Action ID)</span>
                <span class="info-value font-mono">{{ data.actionId || 'A--' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Trạng thái xử lý</span>
                <span class="info-value text-danger font-semibold">FAIL (quá thời gian chờ)</span>
              </div>
            </div>

            <p class="modal-note">
              ESP32 không gửi trạng thái lên topic <code>iot/devices/status</code> trong thời gian chờ.
              Kiểm tra mạch đã được cấp điện và đang kết nối Wi-Fi, MQTT Broker.
            </p>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" @click="goToHistory">
              Xem bảng Action History
            </button>
            <button type="button" class="btn btn-primary" @click="emit('close')">
              Đóng
            </button>
          </div>
        </template>

        <!-- Quá lâu không nhận dữ liệu từ ESP32 -->
        <template v-else>
          <div class="modal-head modal-head--danger">
            <div class="modal-icon modal-icon--danger" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                <line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
            </div>
            <div>
              <h2 id="ex-title-off" class="modal-title">Mất Kết Nối Thiết Bị ESP32</h2>
              <p class="modal-subtitle">Không nhận được dữ liệu cảm biến mới</p>
            </div>
          </div>

          <div class="modal-body">
            <div class="alert-banner">
              <p>
                <strong>Tình trạng:</strong>
                Quá 30 giây không nhận được gói tin cảm biến mới hoặc kênh truyền WebSocket / MQTT bị gián đoạn. Lần nhận số liệu cuối: <strong>{{ data.lastUpdated || '--' }}</strong>.
              </p>
            </div>

          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-primary" @click="emit('close')">
              Đóng
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-note {
  margin: 14px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--color-text-muted);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

.modal-card {
  position: relative;
  width: 100%;
  max-width: 580px;
  background: #ffffff;
  border-radius: var(--radius-xl);
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.35);
  overflow: hidden;
  animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 22px;
  line-height: 1;
  color: var(--color-text-muted);
  background: rgba(100, 116, 139, 0.1);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close:hover {
  color: var(--color-text);
  background: rgba(100, 116, 139, 0.2);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 24px 24px 18px;
  border-bottom: 1px solid var(--color-border);
}

.modal-head--warning {
  background: #fffbeb;
}

.modal-head--danger {
  background: #fef2f2;
}

.modal-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.modal-icon--warning {
  color: #d97706;
  background: #fef3c7;
}

.modal-icon--danger {
  color: #dc2626;
  background: #fee2e2;
}

.modal-title {
  margin: 4px 0 2px;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
}

.modal-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 4px;
  text-transform: uppercase;
}

.badge--action {
  font-family: inherit;
  font-size: 12px;
  color: #1e40af;
  background: #dbeafe;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 14px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.info-value {
  font-size: 13px;
  color: var(--color-text);
}

.font-semibold {
  font-weight: 600;
}

.font-mono {
  font-family: monospace;
}

.text-danger {
  color: var(--color-danger-text);
}

.alert-banner {
  padding: 12px 14px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: #991b1b;
  line-height: 1.5;
}

.alert-banner p {
  margin: 0;
}

.modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px 20px;
  border-top: 1px solid var(--color-border);
  background: #ffffff;
}
</style>
