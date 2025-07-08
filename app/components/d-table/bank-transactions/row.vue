<script setup lang="ts">
import type { DDocument } from "~/types/models"

interface Props {
  bankTransaction: DDocument
}

defineProps<Props>()
</script>

<template>
  <NuxtLink class="grid w-full flex-row justify-between" style="grid-template-columns: 140px 1fr 250px 140px">
  </NuxtLink>
</template>
