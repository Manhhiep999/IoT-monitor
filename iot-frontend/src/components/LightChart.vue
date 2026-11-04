<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { formatHourMinute, formatDateTimeSlash } from '@/utils/datetime'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const props = defineProps({
  history: { type: Array, default: () => [] },
  latest: { type: Object, default: () => ({}) }
})

const latestLight = computed(() => {
  const v = props.latest.light?.value
  return v != null ? Math.round(Number(v)) : '--'
})

const lightPoints = computed(() => {
  return props.history
    .filter((r) => r.sensorType === 'light')
    .map((r) => ({ timestamp: r.timestamp, value: Number(r.value) }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
})

const chartData = computed(() => {
  const points = lightPoints.value
  return {
    labels: points.map((p) => p.timestamp),
    datasets: [
      {
        label: 'Ánh sáng (lux)',
        data: points.map((p) => p.value),
        borderColor: '#10b981',
        backgroundColor: (ctx) => {
          const chart = ctx.chart
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(16, 185, 129, 0.12)'
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          g.addColorStop(0, 'rgba(16, 185, 129, 0.28)')
          g.addColorStop(1, 'rgba(16, 185, 129, 0.01)')
          return g
        },
        borderWidth: 2.2,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#10b981',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
      }
    ]
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  layout: {
    padding: { top: 6, bottom: 2, left: 2, right: 6 }
  },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      titleFont: { size: 12, weight: '700' },
      bodyFont: { size: 11.5 },
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 4,
      callbacks: {
        title(items) {
          if (!items.length) return ''
          return `🕒 ${formatDateTimeSlash(items[0].label)}`
        },
        label(item) {
          return ` ☀️ Ánh sáng: ${item.parsed.y} lux`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { color: '#cbd5e1' },
      ticks: {
        color: '#64748b',
        font: { size: 10.5 },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 6,
        callback(val) {
          return formatHourMinute(this.getLabelForValue(val))
        }
      }
    },
    y: {
      type: 'linear',
      position: 'left',
      ticks: {
        color: '#059669',
        font: { size: 11, weight: '700' },
        padding: 6,
        callback(val) {
          return `${val} lux`
        }
      },
      grid: { color: 'rgba(16, 185, 129, 0.08)' },
      border: { color: '#6ee7b7', width: 2 }
    }
  }
}))
</script>

<template>
  <div class="light-chart-wrap">
    <div class="chart-header">
      <div class="chart-header__left">
        <div class="chart-title-row">
          <span class="sensor-icon" aria-hidden="true">☀️</span>
          <h3 class="chart-title">Biểu Đồ Ánh Sáng</h3>
        </div>
        <p class="chart-subtitle">Cảm biến quang trở LDR (24h)</p>
      </div>

      <div class="live-badge" title="Giá trị ánh sáng realtime">
        <span class="live-dot" />
        <span class="live-num">{{ latestLight }}</span>
        <span class="live-unit">lux</span>
      </div>
    </div>

    <div class="chart-canvas-box">
      <Line
        v-if="lightPoints.length"
        :data="chartData"
        :options="options"
        aria-label="Biểu đồ cường độ ánh sáng"
        role="img"
      />
      <div v-else class="chart-empty">Đang đồng bộ dữ liệu ánh sáng…</div>
    </div>
  </div>
</template>

<style scoped>
.light-chart-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 8px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.chart-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sensor-icon {
  font-size: 14px;
}

.chart-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.chart-subtitle {
  margin: 1px 0 0 20px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 999px;
  color: #059669;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.live-num {
  font-weight: 700;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}

.live-unit {
  font-size: 10.5px;
  font-weight: 500;
  opacity: 0.85;
}

.chart-canvas-box {
  flex: 1;
  min-height: 0;
  position: relative;
  width: 100%;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12.5px;
  color: var(--color-text-muted);
}
</style>
