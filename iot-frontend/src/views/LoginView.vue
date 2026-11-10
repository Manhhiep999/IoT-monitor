<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/services/http'
import { USE_MOCK } from '@/services/config'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({ username: '', password: '' })
const submitting = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!form.username.trim() || !form.password) {
    error.value = 'Vui lòng nhập tài khoản và mật khẩu'
    return
  }
  submitting.value = true
  try {
    await auth.login(form.username.trim(), form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.replace(redirect)
  } catch (e) {
    error.value = errorMessage(e, 'Sai tài khoản hoặc mật khẩu')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login">
    <form class="login__card" novalidate @submit.prevent="submit">
      <div class="login__logo" aria-hidden="true" />
      <h1 class="login__title">Đăng nhập hệ thống</h1>
      <p class="login__subtitle">IoT Room Environment Monitoring (ESP32)</p>

      <div class="login__field">
        <label for="username" class="login__label">Tài khoản / Email</label>
        <input
          id="username"
          v-model="form.username"
          class="login__input"
          type="text"
          autocomplete="username"
          placeholder="admin@iot.com"
          :disabled="submitting"
        />
      </div>

      <div class="login__field">
        <label for="password" class="login__label">Mật khẩu</label>
        <input
          id="password"
          v-model="form.password"
          class="login__input"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          :disabled="submitting"
        />
      </div>

      <p v-if="error" class="login__error" role="alert">{{ error }}</p>

      <button type="submit" class="btn btn-primary login__submit" :disabled="submitting">
        {{ submitting ? 'Đang đăng nhập…' : 'Đăng nhập' }}
      </button>

    </form>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 16px;
  background: var(--color-login-bg);
}

.login__card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.login__logo {
  width: 56px;
  height: 56px;
  background: var(--color-primary);
  border-radius: var(--radius-lg);
}

.login__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.login__subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.login__input {
  width: 100%;
  padding: 11px 14px;
  font-size: 13px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.login__input::placeholder {
  color: var(--color-text-muted);
}

.login__input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.login__error {
  margin: -6px 0 0;
  font-size: 13px;
  color: var(--color-danger-text);
}

.login__submit {
  width: 100%;
  padding: 13px;
  font-size: 15px;
}

.login__hint {
  margin: -6px 0 0;
  font-size: 12px;
  text-align: center;
  color: var(--color-text-muted);
}

@media (max-width: 480px) {
  .login__card {
    padding: 28px 20px;
  }
}
</style>
