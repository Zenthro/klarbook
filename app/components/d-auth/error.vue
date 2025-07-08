<script setup lang="ts">
type Props = {
  message: string
}
const { message } = defineProps<Props>()
</script>
<template>
  <div class="flex items-center gap-3 rounded-lg bg-red-100 p-1 text-sm text-red-800">
    <div class="grid size-8 place-items-center rounded-md bg-red-700">
      <OctagonX class="size-5 text-white" />
    </div>
    <p>
      {{ message }}
    </p>
  </div>
</template>
