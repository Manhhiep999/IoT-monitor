<script setup>
defineProps({
  status: { type: String, required: true } // 'on' | 'off' | 'loading' | 'fail'
})
</script>

<template>
  <span class="badge" :class="`badge--${(status || '').toLowerCase()}`">
    <span v-if="status === 'loading'" class="badge__spinner" aria-hidden="true" />
    {{ (status || '').toUpperCase() }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  border-radius: 999px;
  white-space: nowrap;
}

.badge--on {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.badge--off {
  color: var(--color-neutral);
  background: var(--color-neutral-soft);
}

.badge--loading {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}

.badge--fail,
.badge--failed {
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.badge__spinner {
  width: 9px;
  height: 9px;
  border: 1.5px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
