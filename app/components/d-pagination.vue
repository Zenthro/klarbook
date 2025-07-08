<script setup lang="ts">
interface Props {
  total: number
  offset: number
  limit: number
}

const { total, offset, limit } = defineProps<Props>()

const emit = defineEmits(["prev", "next"])
</script>

<template>
  <nav
    class="flex items-center justify-between border-t border-zinc-200 bg-white px-2 py-2 pl-4"
    aria-label="Pagination"
  >
    <div class="hidden sm:block">
      <p class="text-sm text-zinc-500">
        Showing
        {{ " " }}
        <span class="font-medium">{{ offset + 1 }}</span>
        {{ " " }}
        to
        {{ " " }}
        <span class="font-medium">{{ offset + limit }}</span>
        {{ " " }}
        of
        {{ " " }}
        <span class="font-medium">{{ total }}</span>
        {{ " " }}
        results
      </p>
    </div>
    <div class="flex flex-1 justify-between gap-2 sm:justify-end">
      <d-button variant="secondary" @click="emit('prev')">Previous</d-button>
      <d-button variant="secondary" @click="emit('next')">Next</d-button>
    </div>
  </nav>
</template>
