<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core"

type Props = {
  full?: boolean
}
const { full = false } = defineProps<Props>()

const el = ref<HTMLDivElement>()

const emit = defineEmits(["close"])

function close() {
  emit("close")
}

onKeyStroke("Escape", close)
</script>

<template>
  <div ref="el" class="absolute top-0 right-0 h-full rounded-md bg-white shadow" :class="full ? 'w-full' : 'w-[450px]'">
    <slot />
  </div>
</template>
