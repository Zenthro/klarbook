<script setup lang="ts">
type Props = {
  hover?: boolean
}
const { hover = false } = defineProps<Props>()
</script>

<template>
  <div
    class="flex h-full items-center overflow-hidden rounded-md px-2 py-1.5 text-sm font-medium text-ellipsis whitespace-nowrap text-zinc-500"
    :class="hover ? 'hover:bg-zinc-800/5' : ''"
  >
    <div class="overflow-hidden text-ellipsis">
      <slot></slot>
    </div>
  </div>
</template>
