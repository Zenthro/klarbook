<script setup lang="ts">
type Props = {
  number: number | string
}

const { number } = defineProps<Props>()

const color = computed(() => {
  return parseFloat(String(number)) >= 0 ? "text-green-700" : "text-red-700"
})
</script>

<template>
  <p :class="color" class="tabular-nums">
    {{ formatNumber(parseFloat(String(number))) }}
  </p>
</template>
