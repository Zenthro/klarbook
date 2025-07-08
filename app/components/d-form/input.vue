<script setup lang="ts">
type Props = {
  name: string
  type?: "text" | "email" | "password"
  icon?: any
  required?: boolean
  placeholder?: string
  autocomplete?: string
  label?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  required: false,
  placeholder: "",
  disabled: false,
})

const model = defineModel<string>()
</script>

<template>
  <input
    :id="name"
    v-bind="props"
    v-model="model"
    class="h-9 w-full rounded-lg border border-zinc-200 px-2.5 text-sm text-zinc-950 ring-blue-300 outline-none focus:border-blue-600 focus:bg-white focus:ring-2"
    :class="disabled ? 'cursor-not-allowed bg-zinc-100 opacity-50' : ''"
  />
</template>
