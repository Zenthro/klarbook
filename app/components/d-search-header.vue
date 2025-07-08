<script setup lang="ts">
import { Upload } from "lucide-vue-next"

const props = defineProps<{
  name: string
  searchText: string
  icon?: any
  textFilter?: string
}>()

const emit = defineEmits(["upload", "update:textFilter"])
</script>

<template>
  <div class="flex w-full items-center justify-between border-b border-zinc-200 p-2.5">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <component :is="props.icon" class="h-4 w-4" />
        {{ props.name }}
      </div>
      <input
        type="text"
        class="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
        :placeholder="props.searchText"
        :value="props.textFilter"
        @input="$emit('update:textFilter', $event.target.value)"
      />
    </div>
    <button class="flex items-center gap-2 rounded-lg bg-black px-2 py-1 text-sm text-white" @click="emit('upload')">
      <Upload class="h-4 w-4" />
      Hochladen
    </button>
  </div>
</template>
