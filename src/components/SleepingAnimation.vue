<template>
  <div class="sleeping-animation-container" :style="{ width: size + 'px', height: size + 'px' }">
    <div class="baby-photo-container">
      <slot></slot>
      <div v-if="isSleeping" class="night-overlay"></div>
    </div>
    <div 
      v-for="z in zs" 
      :key="z.id"
      class="sleeping-z"
      :style="{
        left: z.x + '%',
        top: z.y + '%',
        '--end-x': z.endX + '%',
        '--end-y': z.endY + '%',
        '--rotation': z.rotation + 'deg',
        fontSize: z.size + 'px',
        fontFamily: z.fontFamily,
        opacity: z.opacity
      }"
    >
      Z
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  size?: number
  isSleeping?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 100,
  isSleeping: false
})

interface Z {
  id: number
  x: number
  y: number
  endX: number
  endY: number
  size: number
  finalSize: number
  fontFamily: string
  rotation: number
  streamId: number
  streamPosition: number
  startTime: number
  opacity: number
}

const zs = ref<Z[]>([])
let animationInterval: number | null = null
let zId = 0
let streamId = 0
let streamTimeout: number | null = null

function createZStream(): Z[] {
  const stream = []
  const currentStreamId = streamId++
  
  // Always move to the top right (angle = -45 degrees)
  const angle = -Math.PI / 4
  const startDistance = 0 // Start from center (0% from center)
  const endDistance = 80 + Math.random() * 20 // End 80-100% from center
  
  // Calculate start and end positions
  // const startX = 50 + Math.cos(angle) * startDistance // Always 50% (center)
  // const startY = 50 + Math.sin(angle) * startDistance // Always 50% (center)
  const endX = 50 + Math.cos(angle) * endDistance
  const endY = 50 + Math.sin(angle) * endDistance
  
  for (let i = 0; i < 3; i++) {
    const finalSize = Math.random() * 40 + 32 // 32px to 72px final size
    stream.push({
      id: zId++,
      x: 50, // Always start from center
      y: 50, // Always start from center
      endX: endX,
      endY: endY,
      size: 4, // Start small
      finalSize: finalSize, // Store the final size
      fontFamily: 'Righteous',
      rotation: Math.random() * 360, // Random rotation
      streamId: currentStreamId,
      streamPosition: i,
      startTime: Date.now(),
      opacity: 0
    })
  }
  
  return stream
}

function startAnimation() {
  if (!props.isSleeping) return
  if (zs.value.length === 0) {
    zs.value.push(...createZStream())
  }
}

function stopAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval)
    animationInterval = null
  }
  if (streamTimeout) {
    clearTimeout(streamTimeout)
    streamTimeout = null
  }
  zs.value = []
}

onMounted(() => {
  if (props.isSleeping) {
    startAnimation()
    updateAnimation()
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
    updateAnimation()
  } else {
    stopAnimation()
  }
})

// Animate Zs
function animateZs() {
  if (!props.isSleeping) return
  
  zs.value.forEach((z: Z) => {
    const progress = (Date.now() - z.startTime) / 2000 // 2 second animation
    const delay = z.streamPosition * 400 // 400ms delay between Zs in same stream
    
    if (progress < 0) return // Haven't started yet
    
    const adjustedProgress = Math.max(0, Math.min(1, (progress * 1000 - delay) / 1000))
    
    if (adjustedProgress >= 1 && z.opacity <= 0) {
      // Remove Z when animation is complete and fully faded out
      const index = zs.value.findIndex((zItem: Z) => zItem.id === z.id)
      if (index > -1) {
        zs.value.splice(index, 1)
      }
      return
    }
    
    // Interpolate from center to end position
    z.x = 50 + (z.endX - 50) * adjustedProgress
    z.y = 50 + (z.endY - 50) * adjustedProgress
    // Fade in for first 20% of progress, fade out for last 50%
    if (adjustedProgress < 0.2) {
      z.opacity = adjustedProgress / 0.2
    } else if (adjustedProgress > 0.5) {
      z.opacity = 1 - (adjustedProgress - 0.5) / 0.5
    } else {
      z.opacity = 1
    }
    // Clamp opacity between 0 and 1
    z.opacity = Math.max(0, Math.min(1, z.opacity))
    // Grow from small to large
    z.size = 4 + (z.finalSize - 4) * adjustedProgress
  })

  // If all Zs are gone, spawn a new stream after a random delay
  if (zs.value.length === 0 && props.isSleeping && streamTimeout === null) {
    const randomDelay = Math.random() * 2000 // 0-2000ms
    streamTimeout = window.setTimeout(() => {
      zs.value.push(...createZStream())
      streamTimeout = null
    }, randomDelay)
  }
}

// Update animation
function updateAnimation() {
  animateZs()
  requestAnimationFrame(updateAnimation)
}
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
  color: rgba(255, 255, 255, 0.8);
  font-weight: bold;
  pointer-events: none;
  z-index: 2;
  animation: streamAndFade 3s ease-out forwards;
  font-family: 'Righteous', sans-serif !important;
}

@keyframes streamAndFade {
  0% {
    opacity: 0;
    transform: rotate(var(--rotation)) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: rotate(var(--rotation)) scale(1);
  }
  80% {
    opacity: 1;
    transform: rotate(var(--rotation)) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--rotation)) scale(0.8);
    left: var(--end-x);
    top: var(--end-y);
  }
}

.night-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 15, 40, 0.85); /* Even darker navy blue with 85% opacity */
  border-radius: 50%; /* Make it round to match profile photo */
  z-index: 1;
}

@import url('https://fonts.googleapis.com/css2?family=Righteous&display=swap');
</style> 