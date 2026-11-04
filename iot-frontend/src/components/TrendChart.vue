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
  Tooltip
} from 'chart.js'
import { formatHourMinute } from '@/utils/datetime'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

/**
 * Một panel biểu đồ cho một loại cảm biến (small multiples): mỗi đại lượng có
 * đơn vị khác nhau (°C, %, lux) nên mỗi panel giữ một trục Y riêng.
 */
const props = defineProps({
  title: { type: String, required: true },
  unit: { type: String, required: true },
  color: { type: String, required: true },
  points: { type: Array, default: () => [] } // [{ timestamp, value }]
})

const latest = computed(() => props.points.at(-1)?.value)

const chartData = computed(() => ({
  labels: props.points.map((p) => p.timestamp),
  datasets: [
    {
      data: props.points.map((p) => p.value),
      borderColor: props.color,
      backgroundColor: `${props.color}1f`,
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: props.color,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2
    }
  ]
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 8,
      displayColors: false,
      callbacks: {
        title: (items) => items[0]?.label ?? '',
        label: (item) => `${props.title}: ${item.formattedValue} ${props.unit}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { color: '#cbd5e1' },
      ticks: {
        color: '#64748b',
        font: { size: 10 },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 5,
        callback(value) {
          return formatHourMinute(this.getLabelForValue(value))
        }
      }
    },
    y: {
      grid: { color: 'rgba(100, 116, 139, 0.12)' },
      border: { display: false },
      ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 4 }
    }
  }
}))
</script>

<template>
  <figure class="trend">
    <figcaption class="trend__head">
      <span class="trend__swatch" :style="{ background: color }" />
      <span class="trend__title">{{ title }} ({{ unit }})</span>
      <span v-if="latest != null" class="trend__latest">{{ latest }} {{ unit }}</span>
    </figcaption>
    <div class="trend__canvas">
      <Line v-if="points.length" :data="chartData" :options="options" :aria-label="`Biểu đồ ${title} 24 giờ`" role="img" />
      <p v-else class="trend__empty">Chưa có dữ liệu</p>
    </div>
  </figure>
</template>

<style scoped>
.trend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 12px;
  background: var(--color-chart-bg);
  border-radius: var(--radius-sm);
}

.trend__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.trend__swatch {
  width: 10px;
  height: 3px;
  border-radius: 2px;
}

.trend__title {
  font-weight: 600;
  color: var(--color-text);
}

.trend__latest {
  margin-left: auto;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.trend__canvas {
  position: relative;
  height: 130px;
}

.trend__empty {
  display: grid;
  place-items: center;
  height: 100%;
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
