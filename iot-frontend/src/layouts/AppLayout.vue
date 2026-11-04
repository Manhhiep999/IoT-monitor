<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useMonitorStore } from '@/stores/monitor'

const monitor = useMonitorStore()
const menuOpen = ref(false)

onMounted(() => monitor.start())
onBeforeUnmount(() => monitor.stop())
</script>

<template>
  <div class="layout">
    <AppSidebar :open="menuOpen" @navigate="menuOpen = false" />
    <div v-if="menuOpen" class="layout__backdrop" @click="menuOpen = false" />

    <header class="layout__topbar">
      <button type="button" class="layout__menu" aria-label="Mở menu" @click="menuOpen = true">
        <span /><span /><span />
      </button>
      <span class="layout__brand">IoT Monitor</span>
    </header>

    <main class="layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
}

.layout__main {
  flex: 1;
  min-width: 0;
  height: 100vh;
  max-height: 100vh;
  margin-left: var(--sidebar-width);
  padding: 20px 28px;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout__topbar,
.layout__backdrop {
  display: none;
}

@media (max-width: 860px) {
  .layout__main {
    margin-left: 0;
    min-height: calc(100vh - 56px);
    padding: 20px 16px;
  }

  .layout__topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 16px;
    color: #fff;
    background: var(--color-sidebar);
  }

  .layout__brand {
    font-weight: 700;
  }

  .layout__menu {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: none;
    border: 0;
    cursor: pointer;
  }

  .layout__menu span {
    width: 20px;
    height: 2px;
    background: #fff;
    border-radius: 2px;
  }

  .layout__backdrop {
    position: fixed;
    inset: 0;
    z-index: 25;
    display: block;
    background: rgba(15, 23, 42, 0.45);
  }
}
</style>
