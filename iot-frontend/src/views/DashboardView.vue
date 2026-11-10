<script setup>
import { computed } from 'vue'
import { useMonitorStore } from '@/stores/monitor'
import { formatClockAndDate } from '@/utils/datetime'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import LightChart from '@/components/LightChart.vue'
import TempHumChart from '@/components/TempHumChart.vue'
import DeviceControl from '@/components/DeviceControl.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'
import ExceptionModal from '@/components/ExceptionModal.vue'

const monitor = useMonitorStore()

const SENSORS = [
  { type: 'temperature', label: 'Nhiệt độ (DHT11)', title: 'Nhiệt độ', unit: '°C', decimals: 1, hex: '#2a78d6' },
  { type: 'humidity', label: 'Độ ẩm (DHT11)', title: 'Độ ẩm', unit: '%', decimals: 1, hex: '#eb6834' },
  { type: 'light', label: 'Ánh sáng (LDR)', title: 'Ánh sáng', unit: 'lux', decimals: 0, hex: '#1baf7a' }
]

const lastUpdatedText = computed(() => formatClockAndDate(monitor.lastUpdatedAt))
const activeCount = computed(() => monitor.devices.filter((d) => d.currentStatus === 'on').length)

const isModalOpen = computed(() => Boolean(monitor.exceptionAlert || monitor.offlineModalOpen))
const modalType = computed(() => (monitor.exceptionAlert ? 'device_timeout' : 'offline'))
const modalData = computed(() => monitor.exceptionAlert || { lastUpdated: lastUpdatedText.value })
</script>

<template>
  <div class="dashboard">
    <!-- Header trên cùng -->
    <div class="dashboard__top">
      <PageHeader title="IoT Live Monitoring">
        <template #subtitle>
          Cập nhật gần nhất: {{ lastUpdatedText }}
          <span v-if="!monitor.isOffline && monitor.lastUpdatedAt" class="live-dot" title="Đang nhận dữ liệu realtime" />
        </template>
      </PageHeader>
      <p v-if="monitor.errors.latest" class="inline-error">{{ monitor.errors.latest }}</p>
    </div>

    <!-- 3 Thẻ số liệu hiện tại phía trên -->
    <section class="stats" aria-label="Số liệu hiện tại">
      <StatCard
        v-for="s in SENSORS"
        :key="s.type"
        :label="s.label"
        :value="monitor.latest[s.type]?.value ?? null"
        :unit="monitor.latest[s.type]?.unit ?? s.unit"
        :delta="monitor.trends[s.type]"
        :decimals="s.decimals"
        :loading="monitor.loading.latest"
      />
    </section>

    <!-- Bố cục thuận mắt: Khối 2 biểu đồ (Ánh sáng & Nhiệt độ-Độ ẩm) + Khối thiết bị chấp hành -->
    <div class="dashboard__workspace">
      <!-- Vùng 2 biểu đồ: 1 bên Ánh sáng, 1 bên Nhiệt độ & Độ ẩm -->
      <div class="charts-grid">
        <!-- Biểu đồ 1: Ánh sáng (LDR) -->
        <section class="card panel panel--chart">
          <p v-if="monitor.errors.history" class="inline-error">{{ monitor.errors.history }}</p>
          <LightChart
            v-else
            :history="monitor.history"
            :latest="monitor.latest"
          />
        </section>

        <!-- Biểu đồ 2: Nhiệt độ & Độ ẩm (DHT11) -->
        <section class="card panel panel--chart">
          <p v-if="monitor.errors.history" class="inline-error">{{ monitor.errors.history }}</p>
          <TempHumChart
            v-else
            :history="monitor.history"
            :latest="monitor.latest"
          />
        </section>
      </div>

      <!-- Cột phải: Khối điều khiển thiết bị xếp dọc tiện quan sát -->
      <section class="card panel panel--actuators">
        <div class="panel__head">
          <div>
            <h2 class="card-title">Thiết Bị Chấp Hành</h2>
            <p class="panel__subtitle">Điều khiển bật/tắt thiết bị qua MQTT</p>
          </div>
          <span class="active-pill">
            {{ activeCount }}/{{ monitor.devices.length }} BẬT
          </span>
        </div>

        <p v-if="monitor.errors.devices" class="inline-error">{{ monitor.errors.devices }}</p>
        <p v-else-if="monitor.loading.devices && !monitor.devices.length" class="muted">Đang tải thiết bị…</p>
        <div v-else class="actuators-list">
          <DeviceControl
            v-for="device in monitor.devices"
            :key="device.id"
            :device="device"
            @toggle="monitor.toggleDevice"
          />
        </div>

        <p v-if="monitor.actionError" class="inline-error" role="alert">{{ monitor.actionError }}</p>

        <!-- Thẻ thông tin trạm phần cứng IoT -->
        <div class="station-box">
          <div class="station-row">
            <span class="station-label">Trạm phần cứng:</span>
            <span class="station-val">ESP32 (NodeMCU-32S)</span>
          </div>
          <div class="station-row">
            <span class="station-label">Trạng thái kết nối:</span>
            <span class="station-badge" :class="monitor.isOffline ? 'is-offline' : 'is-online'">
              <span class="station-dot" />
              {{ monitor.isOffline ? 'MẤT KẾT NỐI' : 'ONLINE' }}
            </span>
          </div>
          <div class="station-row">
            <span class="station-label">Giao thức:</span>
            <span class="station-val font-mono">MQTT (Port 8899) + WS</span>
          </div>
        </div>
      </section>
    </div>

    <OfflineBanner
      v-if="monitor.isOffline"
      :last-updated="lastUpdatedText"
      @details="monitor.openOfflineModal"
    />

    <ExceptionModal
      :open="isModalOpen"
      :type="modalType"
      :data="modalData"
      @close="monitor.closeExceptionModal"
    />
  </div>
</template>

<style scoped>
.dashboard {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.dashboard__top {
  flex-shrink: 0;
}

.dashboard__top :deep(.page-header) {
  margin-bottom: 0;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  flex-shrink: 0;
}

.dashboard__workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 2.35fr) minmax(300px, 1fr);
  gap: 12px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-height: 0;
  height: 100%;
}

.panel {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
}

.panel--chart {
  min-height: 0;
  height: 100%;
}


.panel--actuators {
  min-height: 0;
  gap: 10px;
  overflow-y: auto;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.card-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text);
}

.panel__subtitle {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.active-pill {
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success);
  background: var(--color-success-soft);
  border-radius: 999px;
  white-space: nowrap;
}

.actuators-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.station-box {
  margin-top: auto;
  padding: 10px 12px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
}

.station-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.station-label {
  color: var(--color-text-muted);
  font-weight: 500;
}

.station-val {
  color: var(--color-text);
  font-weight: 600;
}

.station-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  font-size: 10.5px;
  padding: 1px 7px;
  border-radius: 999px;
}

.station-badge.is-online {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.station-badge.is-offline {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.station-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.font-mono {
  font-family: monospace;
}

.live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 6px;
  vertical-align: middle;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}

.inline-error {
  margin: 0;
  font-size: 13px;
  color: var(--color-danger-text);
}

.muted {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

@media (max-width: 1180px) {
  .dashboard {
    overflow-y: auto;
  }
  .dashboard__workspace {
    grid-template-columns: 1fr;
    flex: none;
  }
  .charts-grid {
    grid-template-columns: 1fr;
    height: auto;
  }
  .panel--chart {
    height: 300px;
  }
}
</style>
