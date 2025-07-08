<script setup lang="ts">
import { useDropZone } from "@vueuse/core"

const zone = useTemplateRef("zone")

const emit = defineEmits(["drop"])

const { isOverDropZone, files } = useDropZone(zone, {
  onDrop: (files) => {
    console.log(files)
    emit("drop", files)
  },
})

watch(files, () => {
  console.log(files)
})
</script>

<template>
  <div
    ref="zone"
    class="relative flex h-full flex-col overflow-auto rounded-md"
    :class="isOverDropZone ? 'ring-2 ring-blue-500 ring-inset' : ''"
  >
    <slot />
  </div>
</template>
