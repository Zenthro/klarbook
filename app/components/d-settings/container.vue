<script setup lang="ts">
type Props = {
  title?: string
}
const { title } = defineProps<Props>()
</script>

<template>
  <div>
    <p v-if="title" class="mb-2 text-sm font-medium text-zinc-800">{{ title }}</p>
    <div class="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4">
      <slot></slot>
    </div>
  </div>
</template>
