<script setup lang="ts">
import { defineProps } from "vue"

const props = defineProps<{
  name: string
  link: string
  icon?: any
}>()
</script>

<template>
  <nuxt-link
    :to="props.link"
    class="flex h-8 w-full items-center gap-2 rounded-md p-2 text-sm text-zinc-700 hover:bg-zinc-300"
  >
    <component :is="props.icon" class="h-4 w-4" />
    {{ props.name }}
  </nuxt-link>
</template>
