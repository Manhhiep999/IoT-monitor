<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import api from '@/services/api'
import * as realtime from '@/services/realtime'
import { errorMessage } from '@/services/http'
import { formatDateTime, formatDateTimeSlash, isValidPartialTimeSlash, normalizeTimeSlash } from '@/utils/datetime'
import PageHeader from '@/components/PageHeader.vue'
import FilterDropdown from '@/components/FilterDropdown.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import DataPagination from '@/components/DataPagination.vue'

const ACTION_OPTIONS = [
  { value: 'ON', label: 'TURN ON' },
  { value: 'OFF', label: 'TURN OFF' }
]

const STATUS_OPTIONS = [
  { value: 'on', label: 'ON' },
  { value: 'off', label: 'OFF' },
  { value: 'fail', label: 'FAIL' },
  { value: 'loading', label: 'LOADING' }
]

const devices = ref([])
const filters = reactive({
  device: '',
  action: '',
  status: '',
  time: ''
})

const paging = reactive({ page: 1, limit: 10 })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const copiedId = ref(null)

const isTimeInvalid = computed(() => !isValidPartialTimeSlash(filters.time))

const deviceOptions = computed(() => {
  return devices.value.map((d) => ({
    value: d.name,
    label: d.name
  }))
})

const hasActiveFilters = computed(() => {
  return Boolean(
    filters.device ||
    filters.action ||
    filters.status ||
    filters.time.trim()
  )
})

async function loadDevices() {
  try {
    const res = await api.getDevices()
    devices.value = res.data ?? []
  } catch {
    devices.value = []
  }
}

function queryParams() {
  const params = {}
  if (filters.device) params.device = filters.device
  if (filters.action) params.action = filters.action
  if (filters.status) params.status = filters.status
  if (filters.time.trim()) {
    const norm = normalizeTimeSlash(filters.time.trim())
    params.time = norm
    params.keyword = norm
  }
  return params
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.getActionHistory({ ...queryParams(), page: paging.page, limit: paging.limit })
    rows.value = res.data ?? []
    total.value = res.total ?? rows.value.length
  } catch (e) {
    error.value = errorMessage(e, 'Không tải được lịch sử thao tác')
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  error.value = ''
  try {
    const blob = await api.exportActionHistory(queryParams())
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `action-history-${formatDateTime(new Date()).replace(/[: ]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = errorMessage(e, 'Xuất CSV thất bại')
  } finally {
    exporting.value = false
  }
}

let copyTimer = null
async function copyTime(row) {
  const text = formatDateTimeSlash(row.createdAt)
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

// Lọc thời gian tự động áp dụng sau 350ms khi gõ xong
let debounce = null
watch(
  () => filters.time,
  () => {
    clearTimeout(debounce)
    if (isTimeInvalid.value) return
    debounce = setTimeout(() => {
      paging.page = 1
      load()
    }, 350)
  }
)

watch(
  () => [filters.device, filters.action, filters.status],
  () => {
    paging.page = 1
    load()
  }
)

function changePage(p) {
  paging.page = p
  load()
}

function changeLimit(l) {
  paging.limit = l
  paging.page = 1
  load()
}

function clearFilters() {
  filters.device = ''
  filters.action = ''
  filters.status = ''
  filters.time = ''
  paging.page = 1
  load()
}

// Khi ESP8266 xác nhận lệnh hoặc lệnh thất bại (fail), tải lại dữ liệu mới nhất
const offStatus = realtime.on('device:status', () => load())
const offActionUpdate = realtime.on('action:update', () => load())

onMounted(async () => {
  await loadDevices()
  load()
})

onBeforeUnmount(() => {
  clearTimeout(debounce)
  clearTimeout(copyTimer)
  offStatus()
  offActionUpdate()
})
</script>

<template>
  <div class="action-history-page">
    <PageHeader title="Action History" subtitle="Lịch sử thao tác điều khiển thiết bị" />

    <!-- Thanh công cụ thu gọn trên 1 dòng duy nhất -->
    <div class="card toolbar-card">
      <div class="toolbar">
        <!-- Ô tìm kiếm theo thời gian -->
        <div class="search-wrap">
          <div class="search-input">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="ah-search"
              v-model="filters.time"
              class="input toolbar__search"
              :class="{ 'is-invalid': isTimeInvalid }"
              type="text"
              placeholder="yyyy/mm/dd hh:mm:ss"
              title="Tìm kiếm theo thời gian (thiếu mức nào sẽ lọc tới mức trước đó)"
              aria-label="Tìm kiếm theo thời gian thực thi"
              @keydown.enter.prevent="!isTimeInvalid && (paging.page = 1, load())"
            />
            <button
              v-if="filters.time"
              type="button"
              class="search-clear"
              aria-label="Xoá nội dung thời gian"
              title="Xoá"
              @click="filters.time = ''"
            >
              ×
            </button>
          </div>
        </div>

        <!-- 1. Bộ lọc thiết bị -->
        <FilterDropdown
          v-model="filters.device"
          class="toolbar__dropdown"
          label="Thiết bị"
          all-label="Tất cả thiết bị"
          :options="deviceOptions"
        />

        <!-- 2. Bộ lọc hành động -->
        <FilterDropdown
          v-model="filters.action"
          class="toolbar__dropdown"
          label="Hành động"
          all-label="Tất cả hành động"
          :options="ACTION_OPTIONS"
        />

        <!-- 3. Bộ lọc trạng thái -->
        <FilterDropdown
          v-model="filters.status"
          class="toolbar__dropdown"
          label="Trạng thái"
          all-label="Tất cả trạng thái"
          :options="STATUS_OPTIONS"
        />

        <!-- Các nút thao tác: Nút Tìm kiếm thay thế cho Xuất CSV -->
        <div class="toolbar__buttons">
          <button
            type="button"
            class="btn btn-primary toolbar__search-btn"
            :disabled="loading || isTimeInvalid"
            @click="paging.page = 1; load()"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="7" cy="7" r="5" />
              <path d="m11 11 3.5 3.5" stroke-linecap="round" />
            </svg>
            Tìm kiếm
          </button>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn btn-ghost toolbar__reset"
            title="Đặt lại tất cả bộ lọc"
            @click="clearFilters"
          >
            Đặt lại
          </button>
        </div>
      </div>

      <p v-if="isTimeInvalid" class="time-error-msg" role="alert">
        Sai định dạng thời gian. Vd hợp lệ: 2026, 2026/08, 2026/08/17, 2026/08/17 09:30
      </p>
    </div>

    <section class="card table-card">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 70px" class="th-stt">STT</th>
              <th style="width: 100px">ID</th>
              <th style="width: 200px">ACTUATOR NAME</th>
              <th style="width: 180px">PERFORMED BY</th>
              <th style="width: 160px">TRIGGERED ACTION</th>
              <th style="width: 130px">STATUS</th>
              <th style="min-width: 240px">EXECUTION TIME</th>
            </tr>
          </thead>
          <tbody :class="{ 'is-loading': loading }">
            <tr v-for="(row, idx) in rows" :key="row.id">
              <td class="stt-cell">{{ (paging.page - 1) * paging.limit + idx + 1 }}</td>
              <td>{{ row.id }}</td>
              <td>{{ row.deviceName }}</td>
              <td>{{ row.performedBy }}</td>
              <td>TURN {{ row.action }}</td>
              <td><StatusBadge :status="row.status" /></td>
              <td>
                <div
                  class="timestamp-cell"
                  :title="row.confirmedAt ? `Xác nhận lúc ${formatDateTimeSlash(row.confirmedAt)}` : 'Chưa nhận xác nhận từ ESP8266'"
                >
                  <span class="timestamp-val">{{ formatDateTimeSlash(row.createdAt) }}</span>
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
              <td colspan="7" class="table-empty">
                {{ loading ? 'Đang tải dữ liệu…' : error || 'Không có thao tác nào phù hợp' }}
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
    <p v-if="error && rows.length" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.action-history-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.action-history-page :deep(.page-header) {
  margin-bottom: 0;
  flex-shrink: 0;
}

.toolbar-card {
  margin-bottom: 0;
  padding: 12px 18px;
  flex-shrink: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-wrap {
  flex: 1.3;
  min-width: 200px;
}

.search-input {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.toolbar__search {
  height: 40px;
  padding-left: 34px;
  padding-right: 30px;
}

.toolbar__dropdown {
  flex: 1;
  min-width: 155px;
  max-width: 200px;
}

.toolbar__buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.toolbar__search-btn,
.toolbar__reset {
  height: 40px;
  padding: 0 18px;
  white-space: nowrap;
}

.toolbar__reset {
  padding: 0 14px;
}

.time-error-msg {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--color-danger-text);
  font-weight: 500;
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
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.data-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-table-head);
}

.data-table td {
  padding-top: 13px;
  padding-bottom: 13px;
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

tbody.is-loading {
  opacity: 0.55;
}

.error {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-danger-text);
}

@media (max-width: 820px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .search-wrap {
    flex: 1 1 100%;
    min-width: 100%;
  }

  .toolbar__dropdown {
    flex: 1;
    min-width: 140px;
    max-width: none;
  }

  .toolbar__buttons {
    margin-left: 0;
    width: 100%;
  }

  .toolbar__buttons .btn {
    flex: 1;
  }
}

@media (max-width: 600px) {
  .toolbar__dropdown {
    flex: 1 1 100%;
    min-width: 100%;
  }
}
</style>



