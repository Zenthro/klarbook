<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core"

const route = useRoute()

const id = computed(() => route.params.id as string)

function close() {
  navigateTo("/bank-transactions")
}

// Esc close
onKeyStroke("Escape", close)
</script>

<template>
  <d-page-pane @close="close">
    <d-bank-transaction-detail :id="id" @refresh="" />
  </d-page-pane>
</template>
