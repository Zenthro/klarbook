<script setup lang="ts">
interface Props {
  name: string
  showSearch?: boolean
  icon?: any
}

const { name, showSearch = false } = defineProps<Props>()

const emit = defineEmits(["upload"])

const search = defineModel("search")
</script>

<template>
  <div class="flex h-12 min-h-12 w-full items-center justify-between border-b border-zinc-100 px-2.5">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <component :is="icon" class="h-4 w-4" />
        {{ name }}
      </div>
      <input
        v-if="showSearch"
        type="text"
        class="h-8 w-[200px] rounded-lg border border-zinc-200 px-2.5 text-sm text-zinc-950 ring-blue-300 transition-all outline-none focus:w-[300px] focus:border-blue-600 focus:ring-2"
        placeholder="Search..."
        v-model="search"
      />
      <slot></slot>
    </div>
    <slot name="trailing"></slot>
  </div>
</template>
