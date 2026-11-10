<script setup>
defineProps({
  lastUpdated: { type: String, default: '--' }
})
const emit = defineEmits(['details'])
</script>

<template>
  <div class="offline" role="alert">
    <span class="offline__icon" aria-hidden="true">!</span>
    <div class="offline__text">
      <p class="offline__title">Mất kết nối với thiết bị ESP32</p>
      <p class="offline__desc">
        Dữ liệu hiển thị có thể không phải là dữ liệu mới nhất. Lần cập nhật cuối: {{ lastUpdated }}
      </p>
    </div>
    <div class="offline__actions">
      <button type="button" class="offline__btn" @click="emit('details')">
        Xem chi tiết ngoại lệ
      </button>
      <span class="offline__pill"><span class="offline__dot" />OFFLINE</span>
    </div>
  </div>
</template>

<style scoped>
.offline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: var(--color-danger-soft);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-lg);
}

.offline__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 15px;
  font-weight: 700;
  color: #dc2626;
  background: #fee2e2;
  border-radius: 50%;
}

.offline__text {
  flex: 1;
  min-width: 0;
}

.offline__text p {
  margin: 0;
}

.offline__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-danger);
}

.offline__desc {
  margin-top: 2px !important;
  font-size: 12.5px;
  color: var(--color-danger-text);
}

.offline__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.offline__btn {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #991b1b;
  background: #fecaca;
  border: 1px solid #f87171;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.offline__btn:hover {
  background: #fca5a5;
  color: #7f1d1d;
}

.offline__pill {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  padding: 5px 14px 5px 11px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-danger);
  background: #fee2e2;
  border-radius: 999px;
}

.offline__dot {
  width: 8px;
  height: 8px;
  background: #dc2626;
  border-radius: 50%;
}

@media (max-width: 600px) {
  .offline {
    flex-wrap: wrap;
  }
}
</style>
