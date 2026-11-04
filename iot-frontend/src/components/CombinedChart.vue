<script setup>
import { computed, ref } from 'vue'
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

// Chế độ trục hoành: mặc định là 'light' (Cường độ ánh sáng theo yêu cầu)
const axisMode = ref('light') // 'light' | 'time'

// Lấy giá trị số mới nhất để hiển thị trên thanh legend
const latestTemp = computed(() => {
  const v = props.latest.temperature?.value
  return v != null ? Number(v).toFixed(1) : '--'
})
const latestHum = computed(() => {
  const v = props.latest.humidity?.value
  return v != null ? Number(v).toFixed(1) : '--'
})
const latestLight = computed(() => {
  const v = props.latest.light?.value
  return v != null ? Math.round(Number(v)) : '--'
})

// Ghép các chuỗi dữ liệu rời (nhiệt độ, độ ẩm, ánh sáng) theo cùng mốc thời gian timestamp
const pairedPoints = computed(() => {
  const map = new Map()
  for (const row of props.history) {
    if (!map.has(row.timestamp)) {
      map.set(row.timestamp, {
        timestamp: row.timestamp,
        temperature: null,
        humidity: null,
        light: null
      })
    }
    const item = map.get(row.timestamp)
    if (row.sensorType === 'temperature') item.temperature = Number(row.value)
    else if (row.sensorType === 'humidity') item.humidity = Number(row.value)
    else if (row.sensorType === 'light') item.light = Number(row.value)
  }
  return Array.from(map.values()).filter(
    (d) => d.light != null && d.temperature != null && d.humidity != null
  )
})

// Dữ liệu mượt mà theo ánh sáng (Binning dữ liệu để tránh nhiễu răng cưa)
const lightBinnedData = computed(() => {
  const points = pairedPoints.value
  if (!points.length) return []

  const sorted = [...points].sort((a, b) => a.light - b.light)
  const minL = Math.floor(sorted[0].light / 10) * 10
  const maxL = Math.ceil(sorted[sorted.length - 1].light / 10) * 10
  const step = Math.max(12, Math.round((maxL - minL) / 32))

  const bins = []
  for (let l = minL; l <= maxL; l += step) {
    const inBin = sorted.filter((p) => p.light >= l - step / 2 && p.light < l + step / 2)
    if (inBin.length) {
      const avgT = inBin.reduce((s, p) => s + p.temperature, 0) / inBin.length
      const avgH = inBin.reduce((s, p) => s + p.humidity, 0) / inBin.length
      bins.push({
        light: l,
        temperature: Math.round(avgT * 10) / 10,
        humidity: Math.round(avgH * 10) / 10,
        samples: inBin.length,
        timestamp: inBin[0].timestamp
      })
    }
  }

  return bins.length >= 6 ? bins : sorted
})

const chartData = computed(() => {
  if (axisMode.value === 'light') {
    const data = lightBinnedData.value

    return {
      datasets: [
        {
          label: 'Nhiệt độ (°C)',
          yAxisID: 'yTemperature',
          data: data.map((d) => ({
            x: d.light,
            y: d.temperature,
            rawTime: d.timestamp,
            lightVal: d.light,
            samples: d.samples
          })),
          borderColor: '#2563eb',
          backgroundColor: (ctx) => {
            const chart = ctx.chart
            const { ctx: c, chartArea } = chart
            if (!chartArea) return 'rgba(37, 99, 235, 0.08)'
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            g.addColorStop(0, 'rgba(37, 99, 235, 0.22)')
            g.addColorStop(1, 'rgba(37, 99, 235, 0.00)')
            return g
          },
          borderWidth: 2.5,
          fill: true,
          tension: 0.38,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        },
        {
          label: 'Độ ẩm (%)',
          yAxisID: 'yHumidity',
          data: data.map((d) => ({
            x: d.light,
            y: d.humidity,
            rawTime: d.timestamp,
            lightVal: d.light,
            samples: d.samples
          })),
          borderColor: '#ea580c',
          backgroundColor: (ctx) => {
            const chart = ctx.chart
            const { ctx: c, chartArea } = chart
            if (!chartArea) return 'rgba(234, 88, 12, 0.08)'
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            g.addColorStop(0, 'rgba(234, 88, 12, 0.20)')
            g.addColorStop(1, 'rgba(234, 88, 12, 0.00)')
            return g
          },
          borderWidth: 2.5,
          fill: true,
          tension: 0.38,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ea580c',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }
      ]
    }
  }

  // Chế độ trục hoành: Thời gian 24h
  const byTime = [...pairedPoints.value].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return {
    labels: byTime.map((d) => d.timestamp),
    datasets: [
      {
        label: 'Nhiệt độ (°C)',
        yAxisID: 'yTemperature',
        data: byTime.map((d) => d.temperature),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.06)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5
      },
      {
        label: 'Độ ẩm (%)',
        yAxisID: 'yHumidity',
        data: byTime.map((d) => d.humidity),
        borderColor: '#ea580c',
        backgroundColor: 'rgba(234, 88, 12, 0.06)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5
      }
    ]
  }
})

const options = computed(() => {
  const isLightMode = axisMode.value === 'light'

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: {
      padding: { top: 6, bottom: 4, left: 4, right: 4 }
    },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false }, // Dùng custom HTML legend bar đẹp mắt ở trên
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12.5, weight: '700' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          title(items) {
            if (!items.length) return ''
            const it = items[0]
            if (isLightMode) {
              const lightVal = it.raw?.lightVal ?? it.parsed?.x
              return `☀️ Cường độ ánh sáng: ${lightVal} lux`
            }
            return `🕒 Thời gian: ${formatDateTimeSlash(it.label)}`
          },
          label(item) {
            const isTemp = item.dataset.yAxisID === 'yTemperature'
            const val = item.parsed.y
            return ` ${item.dataset.label}: ${val} ${isTemp ? '°C' : '%'}`
          },
          afterBody(items) {
            if (!items.length) return ''
            const it = items[0]
            if (isLightMode && it.raw?.rawTime) {
              return `\nThời điểm đo: ${formatDateTimeSlash(it.raw.rawTime)}`
            }
            return ''
          }
        }
      }
    },
    scales: {
      x: isLightMode
        ? {
            type: 'linear',
            grid: { color: 'rgba(226, 232, 240, 0.7)' },
            border: { color: '#cbd5e1' },
            ticks: {
              color: '#334155',
              font: { size: 11, weight: '600' },
              padding: 6,
              callback(val) {
                return `${val} lux`
              }
            }
          }
        : {
            grid: { display: false },
            border: { color: '#cbd5e1' },
            ticks: {
              color: '#64748b',
              font: { size: 10.5 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7,
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
          font: { size: 11.5, weight: '700' },
          padding: 8,
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
          font: { size: 11.5, weight: '700' },
          padding: 8,
          callback(val) {
            return `${val}%`
          }
        },
        grid: { drawOnChartArea: false },
        border: { color: '#fdba74', width: 2 }
      }
    }
  }
})
</script>

<template>
  <div class="combined-chart">
    <!-- Header biểu đồ: Tiêu đề + Chuyển đổi tab thời gian / ánh sáng -->
    <div class="chart-top-bar">
      <div>
        <h2 class="chart-title">Biểu Đồ Tương Quan Cảm Biến</h2>
        <p class="chart-subtitle">
          Khảo sát sự thay đổi của Nhiệt độ &amp; Độ ẩm theo Cường độ ánh sáng môi trường
        </p>
      </div>

      <div class="mode-tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': axisMode === 'light' }"
          @click="axisMode = 'light'"
        >
          ☀️ Trục hoành: Ánh sáng (lux)
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': axisMode === 'time' }"
          @click="axisMode = 'time'"
        >
          🕒 Thời gian (24h)
        </button>
      </div>
    </div>

    <!-- Thanh Legend sắc nét thay thế trục tung đè chữ -->
    <div class="legend-bar">
      <div class="legend-item legend-item--temp">
        <span class="legend-swatch swatch--temp" />
        <span class="legend-name">Nhiệt độ (Trục trái)</span>
        <span class="legend-value">{{ latestTemp }}°C</span>
      </div>

      <div class="legend-item legend-item--humidity">
        <span class="legend-swatch swatch--humidity" />
        <span class="legend-name">Độ ẩm (Trục phải)</span>
        <span class="legend-value">{{ latestHum }}%</span>
      </div>

      <div class="legend-item legend-item--light">
        <span class="legend-swatch swatch--light" />
        <span class="legend-name">Ánh sáng (Trục hoành)</span>
        <span class="legend-value">{{ latestLight }} lux</span>
      </div>
    </div>

    <!-- Khung Canvas vẽ biểu đồ lớn -->
    <div class="chart-canvas-container">
      <Line
        v-if="pairedPoints.length"
        :data="chartData"
        :options="options"
        aria-label="Biểu đồ tổng hợp thông số cảm biến IoT"
        role="img"
      />
      <div v-else class="chart-placeholder">
        Đang tải dữ liệu biểu đồ…
      </div>
    </div>

    <!-- Chú thích chân biểu đồ -->
    <div class="chart-bottom-info">
      <span>
        💡 <strong>Giải thích đồ thị:</strong> Khi cường độ ánh sáng tăng (từ đêm sang ngày), nhiệt độ có xu hướng tăng và độ ẩm môi trường giảm tương ứng.
      </span>
    </div>
  </div>
</template>

<style scoped>
.combined-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 10px;
}

.chart-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.chart-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.chart-subtitle {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.mode-tabs {
  display: inline-flex;
  padding: 3px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  gap: 3px;
}

.tab-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.is-active {
  color: var(--color-primary);
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.legend-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 12px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
}

.legend-swatch {
  width: 12px;
  height: 3px;
  border-radius: 2px;
}

.swatch--temp {
  background: #2563eb;
  box-shadow: 0 0 4px rgba(37, 99, 235, 0.5);
}

.swatch--humidity {
  background: #ea580c;
  box-shadow: 0 0 4px rgba(234, 88, 12, 0.5);
}

.swatch--light {
  background: #059669;
  box-shadow: 0 0 4px rgba(5, 150, 105, 0.5);
}

.legend-name {
  color: var(--color-text-muted);
  font-weight: 500;
}

.legend-value {
  font-weight: 700;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.legend-item--temp .legend-value {
  color: #2563eb;
}

.legend-item--humidity .legend-value {
  color: #ea580c;
}

.legend-item--light .legend-value {
  color: #059669;
}

.chart-canvas-container {
  position: relative;
  flex: 1;
  min-height: 230px;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 14px 6px 10px;
}

.chart-placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 13px;
  color: var(--color-text-muted);
}

.chart-bottom-info {
  flex-shrink: 0;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--color-text-muted);
  background: #f8fafc;
  border-radius: 6px;
  line-height: 1.4;
}

.chart-bottom-info strong {
  color: var(--color-text);
}
</style>
