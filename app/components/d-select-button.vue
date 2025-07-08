<script setup lang="ts">
import { defineProps } from "vue"

const props = defineProps<{
  name: string
  slug: string
  activeButton: string
}>()
</script>

<template>
  <button
    class="rounded-lg border-none p-1 px-2.5 py-1 text-sm text-zinc-700"
    :class="{
      'bg-zinc-50 text-black shadow': props.activeButton == props.slug,
    }"
    @click="$emit('click')"
  >
    {{ props.name }}
  </button>
</template>
