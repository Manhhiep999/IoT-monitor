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

const latestTemp = computed(() => {
  const v = props.latest.temperature?.value
  return v != null ? Number(v).toFixed(1) : '--'
})

const latestHum = computed(() => {
  const v = props.latest.humidity?.value
  return v != null ? Number(v).toFixed(1) : '--'
})

const pairedPoints = computed(() => {
  const map = new Map()
  for (const row of props.history) {
    if (!map.has(row.timestamp)) {
      map.set(row.timestamp, { timestamp: row.timestamp, temperature: null, humidity: null })
    }
    const item = map.get(row.timestamp)
    if (row.sensorType === 'temperature') item.temperature = Number(row.value)
    else if (row.sensorType === 'humidity') item.humidity = Number(row.value)
  }
  return Array.from(map.values())
    .filter((d) => d.temperature != null && d.humidity != null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
})

const chartData = computed(() => {
  const points = pairedPoints.value
  return {
    labels: points.map((p) => p.timestamp),
    datasets: [
      {
        label: 'Nhiệt độ (°C)',
        yAxisID: 'yTemperature',
        data: points.map((p) => p.temperature),
        borderColor: '#2563eb',
        backgroundColor: (ctx) => {
          const chart = ctx.chart
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(37, 99, 235, 0.08)'
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          g.addColorStop(0, 'rgba(37, 99, 235, 0.22)')
          g.addColorStop(1, 'rgba(37, 99, 235, 0.01)')
          return g
        },
        borderWidth: 2.2,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#2563eb',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
      },
      {
        label: 'Độ ẩm (%)',
        yAxisID: 'yHumidity',
        data: points.map((p) => p.humidity),
        borderColor: '#ea580c',
        backgroundColor: (ctx) => {
          const chart = ctx.chart
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(234, 88, 12, 0.08)'
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          g.addColorStop(0, 'rgba(234, 88, 12, 0.18)')
          g.addColorStop(1, 'rgba(234, 88, 12, 0.01)')
          return g
        },
        borderWidth: 2.2,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ea580c',
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
    padding: { top: 6, bottom: 2, left: 2, right: 2 }
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
          const isTemp = item.dataset.yAxisID === 'yTemperature'
          return ` ${item.dataset.label}: ${item.parsed.y} ${isTemp ? '°C' : '%'}`
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
    yTemperature: {
      type: 'linear',
      position: 'left',
      ticks: {
        color: '#2563eb',
        font: { size: 11, weight: '700' },
        padding: 6,
        callback(val) {
          return `${val}°C`
        }
      },
      grid: { color: 'rgba(37, 99, 235, 0.08)' },
      border: { color: '#93c5fd', width: 2 }
    },
    yHumidity: {
      type: 'linear',
      position: 'right',
      ticks: {
        color: '#ea580c',
        font: { size: 11, weight: '700' },
        padding: 6,
        callback(val) {
          return `${val}%`
        }
      },
      grid: { drawOnChartArea: false },
      border: { color: '#fdba74', width: 2 }
    }
  }
}))
</script>

<template>
  <div class="temphum-chart-wrap">
    <div class="chart-header">
      <div class="chart-header__left">
        <div class="chart-title-row">
          <span class="sensor-icon" aria-hidden="true">🌡️💧</span>
          <h3 class="chart-title">Nhiệt Độ &amp; Độ Ẩm</h3>
        </div>
        <p class="chart-subtitle">Cảm biến DHT11 (2 trục tung song song)</p>
      </div>

      <div class="live-badges-group">
        <div class="live-badge badge--temp" title="Nhiệt độ realtime">
          <span class="live-dot dot--temp" />
          <span class="live-num">{{ latestTemp }}</span>
          <span class="live-unit">°C</span>
        </div>
        <div class="live-badge badge--hum" title="Độ ẩm realtime">
          <span class="live-dot dot--hum" />
          <span class="live-num">{{ latestHum }}</span>
          <span class="live-unit">%</span>
        </div>
      </div>
    </div>

    <div class="chart-canvas-box">
      <Line
        v-if="pairedPoints.length"
        :data="chartData"
        :options="options"
        aria-label="Biểu đồ nhiệt độ và độ ẩm"
        role="img"
      />
      <div v-else class="chart-empty">Đang đồng bộ dữ liệu DHT11…</div>
    </div>
  </div>
</template>

<style scoped>
.temphum-chart-wrap {
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
  font-size: 13.5px;
}

.chart-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.chart-subtitle {
  margin: 1px 0 0 24px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.live-badges-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.badge--temp {
  background: rgba(37, 99, 235, 0.09);
  border: 1px solid rgba(37, 99, 235, 0.25);
  color: #1d4ed8;
}

.badge--hum {
  background: rgba(234, 88, 12, 0.09);
  border: 1px solid rgba(234, 88, 12, 0.25);
  color: #c2410c;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot--temp {
  background: #2563eb;
  box-shadow: 0 0 5px rgba(37, 99, 235, 0.6);
}

.dot--hum {
  background: #ea580c;
  box-shadow: 0 0 5px rgba(234, 88, 12, 0.6);
}

.live-num {
  font-weight: 700;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.live-unit {
  font-size: 10px;
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
