<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps({ open: Boolean })
const emit = defineEmits(['navigate'])

const router = useRouter()
const auth = useAuthStore()

const items = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'data-sensor', label: 'Data Sensor' },
  { name: 'action-history', label: 'Action History' },
  { name: 'profile', label: 'Profile' }
]

async function logout() {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-open': open }">
    <div class="sidebar__brand">IoT Monitor</div>

    <nav class="sidebar__nav">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="{ name: item.name }"
        class="sidebar__link"
        active-class="is-active"
        @click="emit('navigate')"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="sidebar__footer">
      <div v-if="auth.user" class="sidebar__user">
        <img src="/avatar.jpg" alt="" class="sidebar__avatar" />
        <span>{{ auth.user.fullName }}</span>
      </div>
      <button type="button" class="sidebar__logout" @click="logout">Đăng xuất</button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: var(--sidebar-width);
  padding: 24px 0;
  background: var(--color-sidebar);
  color: #fff;
}

.sidebar__brand {
  padding: 0 24px 20px;
  font-size: 16px;
  font-weight: 700;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar__link {
  padding: 12px 24px;
  font-size: 14px;
  color: #fff;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.sidebar__link:hover {
  background: rgba(255, 255, 255, 0.06);
  text-decoration: none;
}

.sidebar__link.is-active {
  background: var(--color-primary);
  font-weight: 600;
}

.sidebar__footer {
  margin-top: auto;
  padding: 16px 24px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
}

.sidebar__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
}

.sidebar__logout {
  padding: 0;
  font-size: 13px;
  color: #93c5fd;
  background: none;
  border: 0;
  cursor: pointer;
}

.sidebar__logout:hover {
  text-decoration: underline;
}

@media (max-width: 860px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .sidebar.is-open {
    transform: translateX(0);
  }
}
</style>
