<script setup lang="ts">
type Props = {
  title: string
  subtitle?: string
}

const { title, subtitle } = defineProps<Props>()
</script>

<template>
  <div class="flex items-center">
    <div class="flex-1">
      <p class="text-sm text-zinc-800">{{ title }}</p>
      <p class="text-xs text-zinc-500" v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div class="flex min-w-[280px] justify-end">
      <slot />
    </div>
  </div>
</template>
