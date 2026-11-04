<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/** Dropdown lọc theo thiết kế màn Action History (mục đang chọn tô xanh + dấu ✓). */
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, required: true },
  options: { type: Array, required: true }, // [{ value, label }]
  allLabel: { type: String, default: 'Tất cả' }
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const root = ref(null)

const allOptions = computed(() => [{ value: '', label: props.allLabel }, ...props.options])
const currentLabel = computed(() =>
  props.modelValue === '' ? 'Tất cả' : props.options.find((o) => o.value === props.modelValue)?.label ?? 'Tất cả'
)

function select(value) {
  emit('update:modelValue', value)
  open.value = false
}

function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="dropdown" :class="{ 'is-open': open }" @keydown.esc="open = false">
    <button type="button" class="dropdown__trigger" :aria-expanded="open" aria-haspopup="listbox" @click="open = !open">
      <span>{{ label }}: {{ currentLabel }}</span>
      <svg class="dropdown__chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <ul v-if="open" class="dropdown__menu" role="listbox">
      <li
        v-for="(opt, i) in allOptions"
        :key="opt.value"
        role="option"
        class="dropdown__option"
        :class="{ 'is-selected': opt.value === modelValue, 'has-divider': i === 0 }"
        :aria-selected="opt.value === modelValue"
        tabindex="0"
        @click="select(opt.value)"
        @keydown.enter.prevent="select(opt.value)"
      >
        <span>{{ opt.label }}</span>
        <svg v-if="opt.value === modelValue" width="14" height="11" viewBox="0 0 14 11" aria-hidden="true">
          <path d="M1 5.5 5 9.5 13 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dropdown {
  position: relative;
}

.dropdown__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--color-text);
  text-align: left;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
}

.dropdown.is-open .dropdown__trigger,
.dropdown__trigger:focus-visible {
  border-color: var(--color-primary);
  outline: none;
}

.dropdown__chevron {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: transform 0.15s ease;
}

.dropdown.is-open .dropdown__chevron {
  transform: rotate(180deg);
}

.dropdown__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  width: 100%;
  min-width: 200px;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
}

.dropdown__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px;
  font-size: 13px;
  color: var(--color-text);
  border-radius: 6px;
  cursor: pointer;
}

.dropdown__option.has-divider {
  margin-bottom: 6px;
  box-shadow: 0 7px 0 -6px var(--color-border);
}

.dropdown__option:hover,
.dropdown__option:focus-visible {
  background: #f8fafc;
  outline: none;
}

.dropdown__option.is-selected {
  font-weight: 700;
  color: var(--color-primary-hover);
  background: #eff6ff;
}
</style>
