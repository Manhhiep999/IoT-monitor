<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: null },
  unit: { type: String, default: '' },
  delta: { type: Number, default: null },
  decimals: { type: Number, default: 1 },
  loading: Boolean
})

const display = computed(() => (props.value == null ? '--' : props.value.toFixed(props.decimals)))
const separator = computed(() => (props.unit === 'lux' ? ' ' : ''))

const deltaText = computed(() => {
  if (props.delta == null) return 'Chưa đủ dữ liệu để so sánh'
  const rounded = Number(props.delta.toFixed(props.decimals))
  const arrow = rounded > 0 ? '▲' : rounded < 0 ? '▼' : '■'
  const sign = rounded > 0 ? '+' : ''
  return `${arrow} ${sign}${rounded.toFixed(props.decimals)}${separator.value}${props.unit} so với 5 phút trước`
})
</script>

<template>
  <article class="stat card" :aria-busy="loading">
    <p class="stat__label">{{ label }}</p>
    <p class="stat__value">{{ display }}<template v-if="value != null">{{ separator }}{{ unit }}</template></p>
    <p class="stat__delta" :class="{ 'is-muted': delta == null }">{{ deltaText }}</p>
  </article>
</template>

<style scoped>
.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 18px 20px;
}

.stat p {
  margin: 0;
}

.stat__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.stat__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.stat__delta {
  font-size: 11px;
  color: var(--color-success);
}

.stat__delta.is-muted {
  color: var(--color-text-muted);
}
</style>
