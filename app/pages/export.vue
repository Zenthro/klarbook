<script setup lang="ts">
const startDate = ref(null)
const endDate = ref(null)

async function exportData() {
  // open a new window with the data
  window.open(`/api/export?startDate=${startDate.value}&endDate=${endDate.value}`, "_blank")
}
</script>

<template>
  <d-page>
    <div class="p-4 text-sm font-medium text-zinc-500">
      <form @submit.prevent="exportData">
        <input type="date" v-model="startDate" />
        <input type="date" v-model="endDate" />
        <d-button type="submit">Export</d-button>
      </form>
    </div>
  </d-page>
</template>
