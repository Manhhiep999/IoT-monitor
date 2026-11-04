<script setup>
import PageHeader from '@/components/PageHeader.vue'
import { PROFILE, DELIVERABLES } from '@/utils/profile'
</script>

<template>
  <div class="profile">
    <PageHeader title="Profile" subtitle="Thông tin sinh viên và bàn giao dự án" />

    <section class="card student">
      <img v-if="PROFILE.avatarUrl" :src="PROFILE.avatarUrl" alt="" class="student__avatar" />
      <div v-else class="student__avatar" aria-hidden="true" />
      <div class="student__info">
        <h2 class="student__name">{{ PROFILE.fullName }}</h2>
        <p><span class="student__key">Mã sinh viên:</span> {{ PROFILE.studentId }}</p>
        <p><span class="student__key">Lớp:</span> {{ PROFILE.className }}</p>
        <p><span class="student__key">Nhóm/Đề tài:</span> {{ PROFILE.topic }}</p>
      </div>
    </section>

    <h2 class="card-title section-title">Project Deliverables</h2>

    <ul class="deliverables">
      <li v-for="item in DELIVERABLES" :key="item.title">
        <component
          :is="item.url ? 'a' : 'div'"
          class="deliverable"
          :href="item.url || undefined"
          :target="item.url ? '_blank' : undefined"
          :rel="item.url ? 'noopener noreferrer' : undefined"
        >
          <span class="deliverable__icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="deliverable__body">
            <span class="deliverable__title">{{ item.title }}</span>
            <span class="deliverable__text" :class="{ 'is-placeholder': item.text.startsWith('github/') }">{{ item.text }}</span>
          </span>
        </component>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.profile {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-right: 4px;
}

.profile :deep(.page-header) {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.student {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
}

.student__avatar {
  flex-shrink: 0;
  width: 104px;
  height: 104px;
  object-fit: cover;
  background: #d3e1fa;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.18);
}

.student__info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.student__info p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text);
}

.student__name {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.student__key {
  margin-right: 2px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.section-title {
  margin: 24px 0;
}

.deliverables {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.deliverable {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  color: inherit;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
}

a.deliverable:hover {
  border-color: var(--color-primary);
  text-decoration: none;
}

.deliverable__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 36px;
  height: 36px;
  font-size: 16px;
  background: var(--color-primary-soft);
  border-radius: var(--radius-sm);
}

.deliverable__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.deliverable__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.deliverable__text {
  overflow: hidden;
  font-size: 12px;
  color: var(--color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deliverable__text.is-placeholder {
  color: #000;
}

@media (max-width: 600px) {
  .student {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
