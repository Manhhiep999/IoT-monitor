<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function onExpired() {
  auth.clear()
  router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
}

onMounted(() => window.addEventListener('auth:expired', onExpired))
onBeforeUnmount(() => window.removeEventListener('auth:expired', onExpired))
</script>

<template>
  <RouterView />
</template>
