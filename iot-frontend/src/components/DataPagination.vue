<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  limit: { type: Number, required: true },
  total: { type: Number, required: true },
  pageSizes: { type: Array, default: () => [10, 20, 50] }
})
const emit = defineEmits(['update:page', 'update:limit'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
const from = computed(() => (props.total ? (props.page - 1) * props.limit + 1 : 0))
const to = computed(() => Math.min(props.total, props.page * props.limit))

/** Danh sách số trang rút gọn: 1 … 4 5 6 … 20 */
const pages = computed(() => {
  const n = totalPages.value
  const cur = props.page
  const set = new Set([1, n, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= n))
  const sorted = [...set].sort((a, b) => a - b)
  const result = []
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) result.push('…' + p)
    result.push(p)
  })
  return result
})

function go(p) {
  if (p >= 1 && p <= totalPages.value && p !== props.page) emit('update:page', p)
}
</script>

<template>
  <div class="pagination">
    <span class="pagination__info">Hiển thị {{ from }}–{{ to }} / {{ total }} bản ghi</span>

    <div class="pagination__controls">
      <label class="pagination__size">
        <span class="sr-only">Số dòng mỗi trang</span>
        <select :value="limit" @change="emit('update:limit', Number($event.target.value))">
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }} / trang</option>
        </select>
      </label>

      <button type="button" class="pagination__btn" :disabled="page <= 1" aria-label="Trang trước" @click="go(page - 1)">‹</button>
      <template v-for="p in pages" :key="p">
        <span v-if="typeof p === 'string'" class="pagination__gap">…</span>
        <button
          v-else
          type="button"
          class="pagination__btn"
          :class="{ 'is-active': p === page }"
          :aria-current="p === page ? 'page' : undefined"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
      <button type="button" class="pagination__btn" :disabled="page >= totalPages" aria-label="Trang sau" @click="go(page + 1)">›</button>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
}

.pagination__info {
  font-size: 12px;
  color: var(--color-text-muted);
}

.pagination__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.pagination__size select {
  height: 30px;
  margin-right: 8px;
  padding: 0 8px;
  font-size: 12px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.pagination__btn {
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--color-text);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
}

.pagination__btn:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.pagination__btn.is-active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: 600;
}

.pagination__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination__gap {
  padding: 0 4px;
  color: var(--color-text-muted);
}
</style>
