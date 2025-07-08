<script setup lang="ts">
interface Props {
  name: string
}

defineProps<Props>()
</script>

<template>
  <div class="relative grid w-full grid-cols-[130px_3fr] flex-row items-start gap-4">
    <label class="flex w-full items-center pt-1 text-sm font-medium text-zinc-500" :title="name">
      <p class="overflow-hidden text-ellipsis">
        {{ name }}
      </p>
    </label>
    <div class="h-full w-full">
      <slot></slot>
    </div>
  </div>
</template>
