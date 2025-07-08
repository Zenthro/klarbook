<script setup lang="ts">
// code here
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden">
    <d-sidebar />
    <div class="w-full flex-1 overflow-scroll">
      <slot />
    </div>
  </div>
</template>
