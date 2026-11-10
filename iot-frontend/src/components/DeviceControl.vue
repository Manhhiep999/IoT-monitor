<script setup>
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import ToggleSwitch from './ToggleSwitch.vue'

const props = defineProps({
  device: { type: Object, required: true },
  description: { type: String, default: 'Điều khiển bật/tắt đèn chiếu sáng' }
})
const emit = defineEmits(['toggle'])

const isLoading = computed(() => props.device.currentStatus === 'loading')
</script>

<template>
  <div class="device">
    <div class="device__info">
      <div class="device__icon" :class="{ 'is-on': device.currentStatus === 'on' }" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
        </svg>
      </div>
      <div>
        <p class="device__name">{{ device.name }}</p>
        <p class="device__desc">
          {{ isLoading ? 'Đang chờ ESP32 xác nhận…' : device.description || description }}
        </p>
      </div>
    </div>
    <div class="device__actions">
      <StatusBadge :status="device.currentStatus" />
      <ToggleSwitch
        :model-value="device.currentStatus === 'on'"
        :disabled="isLoading"
        :label="`Bật/tắt ${device.name}`"
        @update:model-value="emit('toggle', device)"
      />
    </div>
  </div>
</template>

<style scoped>
.device {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: all 0.15s ease;
}

.device:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.device__info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.device__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.device__icon.is-on {
  color: #ca8a04;
  background: var(--color-lamp-soft);
  box-shadow: 0 0 0 2.5px rgba(250, 204, 21, 0.35);
}

.device__name,
.device__desc {
  margin: 0;
}

.device__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.device__desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.device__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

</style>
