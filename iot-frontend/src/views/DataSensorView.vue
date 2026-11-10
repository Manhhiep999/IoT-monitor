<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import api from '@/services/api'
import { errorMessage } from '@/services/http'
import { formatDateTimeSlash, isValidPartialTimeSlash, normalizeTimeSlash } from '@/utils/datetime'
import PageHeader from '@/components/PageHeader.vue'
import DataPagination from '@/components/DataPagination.vue'

const CRITERIA_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'temperature', label: 'Nhiệt độ' },
  { value: 'humidity', label: 'Độ ẩm' },
  { value: 'light', label: 'Ánh sáng' },
  { value: 'time', label: 'Thời gian' }
]

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const copiedId = ref(null)

// Giá trị đang nhập trên thanh lọc
const form = reactive({
  field: 'all',
  value: ''
})

// Điều kiện đã áp dụng (chỉ thay đổi khi bấm Tìm kiếm hoặc Đặt lại)
const applied = reactive({
  field: 'all',
  value: ''
})

const paging = reactive({ page: 1, limit: 10 })

const isTimeInvalid = computed(() => {
  if (form.field !== 'time') return false
  return !isValidPartialTimeSlash(form.value)
})

const searchPlaceholder = computed(() => {
  switch (form.field) {
    case 'temperature':
      return 'Nhập nhiệt độ cần lọc (vd: 26, 26.5)...'
    case 'humidity':
      return 'Nhập độ ẩm cần lọc (vd: 68, 68.5)...'
    case 'light':
      return 'Nhập ánh sáng cần lọc (vd: 450)...'
    case 'time':
      return 'yyyy/mm/dd hh:mm:ss'
    default:
      return 'Nhập giá trị cần tìm kiếm...'
  }
})

const searchHint = computed(() => {
  switch (form.field) {
    case 'temperature':
      return 'Lọc theo nhiệt độ (°C). Ví dụ: nhập 26 sẽ lọc 26.0, 26.1...'
    case 'humidity':
      return 'Lọc theo độ ẩm (%). Ví dụ: nhập 68 sẽ lọc 68.0, 68.1...'
    case 'light':
      return 'Lọc theo ánh sáng (lux). Ví dụ: nhập 45 sẽ lọc 45, 450...'
    case 'time':
      return isTimeInvalid.value
        ? 'Sai định dạng thời gian. Ví dụ hợp lệ: 2026, 2026/08, 2026/08/17, 2026/08/17 09:30'
        : 'Định dạng: yyyy/mm/dd hh:mm:ss (thiếu mức nào sẽ lọc tới mức trước đó)'
    default:
      return 'Tìm kiếm linh hoạt trên tất cả các cột'
  }
})

let copyTimer = null
async function copyTime(row) {
  const text = formatDateTimeSlash(row.timestamp)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copiedId.value = row.id
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      if (copiedId.value === row.id) copiedId.value = null
    }, 1800)
  } catch (err) {
    console.error('Lỗi sao chép:', err)
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const rawVal = applied.value.trim()
    const q = applied.field === 'time' ? normalizeTimeSlash(rawVal) : rawVal
    const params = {
      page: paging.page,
      limit: paging.limit,
      field: applied.field,
      value: q
    }

    if (['temperature', 'humidity', 'light'].includes(applied.field)) {
      params.type = applied.field
      if (q) params.search = q
    } else if (applied.field === 'time') {
      if (q) params.time = q
    } else if (q) {
      params.search = q
    }

    const res = await api.getSensorData(params)
    rows.value = res.data ?? []
    total.value = res.total ?? rows.value.length
  } catch (e) {
    error.value = errorMessage(e, 'Không tải được dữ liệu cảm biến')
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function search() {
  if (isTimeInvalid.value) return
  applied.field = form.field
  applied.value = form.value.trim()
  paging.page = 1
  load()
}

function reset() {
  form.field = 'all'
  form.value = ''
  applied.field = 'all'
  applied.value = ''
  paging.page = 1
  load()
}

function changePage(p) {
  paging.page = p
  load()
}

function changeLimit(l) {
  paging.limit = l
  paging.page = 1
  load()
}

const unitDecimals = (type) => (type === 'temperature' || type === 'humidity' ? 1 : 0)

onMounted(() => {
  load()
})
</script>

<template>
  <div class="data-sensor-page">
    <PageHeader title="Data Sensor" subtitle="Tra cứu lịch sử dữ liệu cảm biến nhiệt độ, độ ẩm, ánh sáng" />

    <form class="card filters" @submit.prevent="search">
      <div class="filters__field filters__field--dropdown">
        <label class="field-label" for="f-criteria">Tìm kiếm theo</label>
        <div class="select">
          <select id="f-criteria" v-model="form.field" class="input">
            <option v-for="opt in CRITERIA_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="filters__field filters__field--search">
        <label class="field-label" for="f-val">Giá trị tìm kiếm</label>
        <div class="search-input">
          <input
            id="f-val"
            v-model="form.value"
            class="input"
            :class="{ 'is-invalid': isTimeInvalid }"
            type="text"
            :placeholder="searchPlaceholder"
            :aria-invalid="isTimeInvalid"
            aria-describedby="f-val-hint"
          />
          <button
            v-if="form.value"
            type="button"
            class="search-clear"
            aria-label="Xoá nội dung tìm kiếm"
            title="Xoá"
            @click="form.value = ''"
          >
            ×
          </button>
        </div>
        <small id="f-val-hint" class="filters__hint" :class="{ 'is-error': isTimeInvalid }">
          {{ searchHint }}
        </small>
      </div>

      <div class="filters__buttons">
        <button type="submit" class="btn btn-primary" :disabled="loading || isTimeInvalid">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="7" cy="7" r="5" />
            <path d="m11 11 3.5 3.5" stroke-linecap="round" />
          </svg>
          Tìm kiếm
        </button>
        <button type="button" class="btn btn-ghost" :disabled="loading" @click="reset">
          Đặt lại
        </button>
      </div>
    </form>

    <section class="card table-card">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 70px" class="th-stt">STT</th>
              <th style="width: 120px">ID</th>
              <th style="width: 220px">Sensor Type</th>
              <th style="width: 160px">Value</th>
              <th style="width: 100px">Unit</th>
              <th style="min-width: 240px">Timestamp</th>
            </tr>
          </thead>
          <tbody :class="{ 'is-loading': loading }">
            <tr v-for="(row, idx) in rows" :key="row.id">
              <td class="stt-cell">{{ (paging.page - 1) * paging.limit + idx + 1 }}</td>
              <td>{{ row.id }}</td>
              <td>{{ row.sensorType }}</td>
              <td class="num font-semibold">{{ Number(row.value).toFixed(unitDecimals(row.sensorType)) }}</td>
              <td>{{ row.unit }}</td>
              <td>
                <div class="timestamp-cell">
                  <span class="timestamp-val">{{ formatDateTimeSlash(row.timestamp) }}</span>
                  <button
                    type="button"
                    class="btn-copy"
                    :class="{ 'is-copied': copiedId === row.id }"
                    :title="copiedId === row.id ? 'Đã sao chép!' : 'Sao chép thời gian'"
                    :aria-label="copiedId === row.id ? 'Đã sao chép' : 'Sao chép thời gian'"
                    @click="copyTime(row)"
                  >
                    <svg
                      v-if="copiedId === row.id"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <svg
                      v-else
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{{ copiedId === row.id ? 'Đã chép' : 'Copy' }}</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="table-empty">
                {{ loading ? 'Đang tải dữ liệu…' : error || 'Không tìm thấy dữ liệu phù hợp' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <DataPagination
        v-if="total > 0"
        :page="paging.page"
        :limit="paging.limit"
        :total="total"
        @update:page="changePage"
        @update:limit="changeLimit"
      />
    </section>
  </div>
</template>

<style scoped>
.data-sensor-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.data-sensor-page :deep(.page-header) {
  margin-bottom: 0;
  flex-shrink: 0;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 0;
  padding: 12px 16px;
  flex-shrink: 0;
}

.filters__field--dropdown {
  width: 170px;
}

.filters__field--search {
  flex: 1;
  min-width: 260px;
}

.filters__hint {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.filters__hint.is-error {
  color: var(--color-danger-text);
  font-weight: 500;
}

.filters__buttons {
  display: flex;
  gap: 8px;
  padding-top: 18px;
}

.btn-ghost {
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-border);
}

.btn-ghost:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-surface-muted);
}

.select {
  position: relative;
}

.select::after {
  position: absolute;
  top: 50%;
  right: 12px;
  font-size: 9px;
  color: var(--color-text-muted);
  content: '▼';
  pointer-events: none;
  transform: translateY(-50%);
}

.select select {
  padding-right: 28px;
  appearance: none;
  cursor: pointer;
}

.search-input {
  position: relative;
}

.search-input .input {
  padding-right: 32px;
}

.search-clear {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  color: var(--color-text-muted);
  background: rgba(100, 116, 139, 0.15);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.search-clear:hover {
  color: var(--color-text);
  background: rgba(100, 116, 139, 0.3);
}

.table-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 0;
}

.table-card .table-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.data-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-table-head);
}

tbody.is-loading {
  opacity: 0.55;
}

.th-stt,
.stt-cell {
  text-align: center;
  width: 70px;
}

.stt-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--color-text-muted);
}

.num {
  font-variant-numeric: tabular-nums;
}

.font-semibold {
  font-weight: 600;
}

.timestamp-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.timestamp-val {
  font-variant-numeric: tabular-nums;
}

.btn-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}

.btn-copy:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.btn-copy.is-copied {
  color: var(--color-success-strong);
  border-color: var(--color-success);
  background: var(--color-success-soft);
}

@media (max-width: 680px) {
  .filters__field--dropdown,
  .filters__field--search {
    width: 100%;
    min-width: 0;
  }

  .filters__buttons {
    width: 100%;
    padding-top: 0;
  }

  .filters__buttons .btn {
    flex: 1;
  }
}
</style>

