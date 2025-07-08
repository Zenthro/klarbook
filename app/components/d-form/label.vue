<script setup lang="ts">
type Props = {
  name: string
}

const { name } = defineProps<Props>()
</script>

<template>
  <label :for="name" class="mb-1 flex justify-between text-sm font-medium text-zinc-700">
    <p>
      <slot></slot>
    </p>
  </label>
</template>
