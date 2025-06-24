<script setup lang="ts">
defineProps<{
  icon: string
  alt: string
  title?: string
}>()
const emit = defineEmits(['click'])
</script>

<template>
  <button class="icon-btn" :title="title" @click="$emit('click')">
    <img :src="icon" :alt="alt" class="icon-btn-img" />
  </button>
</template>

<style scoped>
.icon-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  width: 40px;
  height: 40px;
}
.icon-btn:hover {
  opacity: 1;
  background: rgba(255,255,255,0.08);
}
.icon-btn-img {
  width: 1.5rem;
  height: 1.5rem;
  display: block;
  filter: brightness(0) invert(1);
}
</style> 