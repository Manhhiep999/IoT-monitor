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

const emit = defineEmits(['close', 'reconnect'])
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

        <!-- Kịch bản 1: Ngoại lệ không nhận phản hồi phần cứng (LED 2 Timeout) -->
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
              <span class="badge badge--warning">MÔ PHỎNG NGOẠI LỆ USE CASE 04</span>
              <h2 id="ex-title-dev" class="modal-title">Cảnh Báo Ngoại Lệ: Không Nhận Phản Hồi Phần Cứng</h2>
              <p class="modal-subtitle">Đã kích hoạt cơ chế an toàn (Fail-Safe Rollback)</p>
            </div>
          </div>

          <div class="modal-body">
            <!-- Thông tin chi tiết sự cố -->
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Thiết bị chấp hành</span>
                <span class="info-value font-semibold">{{ data.device?.name || 'Đèn LED 2' }}</span>
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
                <span class="info-value text-danger font-semibold">FAIL (Timeout Exception)</span>
              </div>
            </div>

            <!-- Khối mô tả đối chiếu với Báo cáo đề tài -->
            <div class="report-box">
              <div class="report-box__head">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>Mô tả luồng xử lý ngoại lệ theo Báo cáo Đồ án (Mục 3.4 &amp; Hình 3.4)</span>
              </div>
              <ul class="report-list">
                <li>
                  <strong>Tách bạch yêu cầu &amp; trạng thái thực tế:</strong>
                  Khi người dùng bật/tắt, Frontend gửi lệnh tới Backend. Hệ thống gán trạng thái tạm thời <code>LOADING</code> khi đang chờ xử lý và không giả định đèn đã đổi trạng thái vật lý.
                </li>
                <li>
                  <strong>Phát hiện không có phản hồi:</strong>
                  Lệnh được publish lên topic <code>device_control</code> (payload <code>{"led2":"on"}</code>), nhưng sau thời gian chờ, vi điều khiển ESP8266 không gửi bản tin xác nhận trạng thái qua <code>device_response</code>.
                </li>
                <li>
                  <strong>Cơ chế tự động hoàn tác (Fail-Safe Rollback):</strong>
                  Hệ thống tự động trả công tắc về trạng thái cũ (<code>{{ (data.previousStatus || 'off').toUpperCase() }}</code>), ngăn ngừa việc giao diện web hiển thị sai lệch so với trạng thái bóng đèn thật trong phòng học.
                </li>
                <li>
                  <strong>Đánh dấu ngoại lệ &amp; Lưu vết kiểm tra:</strong>
                  Yêu cầu được đánh dấu trạng thái <code>FAIL</code> trong cơ sở dữ liệu (kết thúc trạng thái <code>LOADING</code>) để phục vụ kiểm tra và đối soát trong trang <em>Action History</em>.
                </li>
              </ul>
            </div>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" @click="goToHistory">
              Xem bảng Action History
            </button>
            <button type="button" class="btn btn-primary" @click="emit('close')">
              Đã hiểu &amp; Đóng
            </button>
          </div>
        </template>

        <!-- Kịch bản 2: Mất kết nối vi điều khiển ESP8266 -->
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
              <span class="badge badge--danger">MÔ PHỎNG NGOẠI LỆ KẾT NỐI</span>
              <h2 id="ex-title-off" class="modal-title">Mất Kết Nối Thiết Bị ESP8266</h2>
              <p class="modal-subtitle">Không nhận được dữ liệu cảm biến mới từ phòng học</p>
            </div>
          </div>

          <div class="modal-body">
            <div class="alert-banner">
              <p>
                <strong>Tình trạng:</strong>
                Quá 30 giây không nhận được gói tin cảm biến mới hoặc kênh truyền WebSocket / MQTT bị gián đoạn. Lần nhận số liệu cuối: <strong>{{ data.lastUpdated || '--' }}</strong>.
              </p>
            </div>

            <div class="report-box">
              <div class="report-box__head">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>Xử lý ngoại lệ theo Báo cáo Đồ án (Mục 1.3 &amp; 3.2)</span>
              </div>
              <ul class="report-list">
                <li>
                  <strong>Bảo toàn số liệu:</strong>
                  Giao diện giữ nguyên số liệu đo gần nhất của nhiệt độ, độ ẩm và ánh sáng, tránh tình trạng màn hình bị trắng hoặc số liệu biến mất đột ngột.
                </li>
                <li>
                  <strong>Cảnh báo thời gian thực:</strong>
                  Tạm ngưng trạng thái Realtime (chấm xanh nhấp nháy tắt) và hiển thị thanh cảnh báo OFFLINE đỏ rực ở chân trang Dashboard.
                </li>
                <li>
                  <strong>Khóa điều khiển an toàn:</strong>
                  Các thao tác bật/tắt thiết bị sẽ được cảnh báo hoặc báo lỗi timeout nếu không có kết nối tới mạch vi điều khiển.
                </li>
              </ul>
            </div>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" @click="emit('close')">
              Đóng thông báo
            </button>
            <button type="button" class="btn btn-success" @click="emit('reconnect')">
              Khôi phục kết nối (Demo)
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
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

.badge--warning {
  color: #b45309;
  background: #fde68a;
}

.badge--danger {
  color: #b91c1c;
  background: #fecaca;
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

.report-box {
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid var(--color-primary);
  border-radius: 6px;
}

.report-box__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary-hover);
  margin-bottom: 8px;
}

.report-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.6;
  color: #334155;
}

.report-list li {
  margin-bottom: 6px;
}

.report-list code {
  padding: 1px 5px;
  font-size: 11px;
  font-family: monospace;
  background: #e2e8f0;
  border-radius: 3px;
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
