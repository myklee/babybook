<template>
  <div class="sleeping-animation-container" :style="{ width: size + 'px', height: size + 'px' }">
    <div class="baby-photo-container">
      <slot></slot>
      <div v-if="isSleeping" class="night-overlay"></div>
    </div>
    <div v-if="isSleeping" class="sleeping-z z1">Z</div>
    <div v-if="isSleeping" class="sleeping-z z2">Z</div>
    <div v-if="isSleeping" class="sleeping-z z3">Z</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface Props {
  size?: number
  isSleeping?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 100,
  isSleeping: false
})

let animationInterval: number | null = null

function startAnimation() {
  if (!props.isSleeping) return
  
  // Restart animation every 3 seconds
  animationInterval = window.setInterval(() => {
    if (props.isSleeping) {
      // Force re-render by toggling isSleeping briefly
      // This will restart the CSS animations
    }
  }, 3000)
}

function stopAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval)
    animationInterval = null
  }
}

onMounted(() => {
  if (props.isSleeping) {
    startAnimation()
  }
})

onUnmounted(() => {
  stopAnimation()
})

// Watch for changes in sleeping state
import { watch } from 'vue'
watch(() => props.isSleeping, (newValue) => {
  if (newValue) {
    startAnimation()
  } else {
    stopAnimation()
  }
})
</script>

<style scoped>
.sleeping-animation-container {
  position: relative;
  display: inline-block;
}

.baby-photo-container {
  position: relative;
  z-index: 1;
  border-radius: 50%;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.baby-photo-container ::v-deep(img),
.baby-photo-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.sleeping-z {
  position: absolute;
  left: 50%;
  top: 50%;
  color: var(--color-text-tertiary);
  font-weight: bold;
  pointer-events: none;
  z-index: 2;
  font-family: 'Righteous', sans-serif !important;
  font-size: 16px;
  transform: translate(-50%, -50%);
}

.z1 {
  animation: floatZ1 3s ease-out infinite;
}

.z2 {
  animation: floatZ2 3s ease-out infinite;
  animation-delay: 1s;
}

.z3 {
  animation: floatZ3 3s ease-out infinite;
  animation-delay: 2s;
}

@keyframes floatZ1 {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-15deg) scale(0.5);
  }
  20% {
    opacity: 1;
  
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(10%, -180%) rotate(25deg) scale(1.5);
  }
}

@keyframes floatZ2 {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-10deg) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(-5deg) scale(1);
  }
  80% {
    opacity: 1;
    transform: translate(-25%, -90%) rotate(10deg) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(0%, -170%) rotate(20deg) scale(1.5);
  }
}

@keyframes floatZ3 {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-20deg) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(-12deg) scale(1);
  }
  80% {
    opacity: 1;
    transform: translate(-30%, -95%) rotate(12deg) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(-5%, -175%) rotate(22deg) scale(1.5);
  }
}

.night-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-bg-secondary);
  border-radius: 50%;
  z-index: 1;
}
</style> 