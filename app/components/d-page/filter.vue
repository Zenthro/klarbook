<script setup lang="ts">
interface Props {
  names: string[]
  values: (string | null)[]
}

const { names, values } = defineProps<Props>()

const filter = defineModel("filter")
</script>

<template>
  <div class="flex w-fit gap-1 rounded-lg bg-zinc-100 p-0.5">
    <button
      v-for="(name, index) in names"
      :key="index"
      @click="filter = values[index]"
      class="rounded-md border-none px-2.5 py-1 text-sm font-medium ring-blue-600 transition-all outline-none"
      :class="
        filter === values[index]
          ? '!hover:bg-zinc-50 bg-white text-zinc-700 shadow ring-1 ring-zinc-200'
          : 'active:inset-shadow text-zinc-500 hover:bg-zinc-200'
      "
    >
      {{ name }}
    </button>
  </div>
</template>
