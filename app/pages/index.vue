<script setup lang="ts">
import { ChartLineIcon } from "lucide-vue-next"

const { data } = await useFetch("/api/stats")
</script>

<template>
  <d-page ref="dropZoneRef">
    <d-page-header name="Dashboard" :icon="ChartLineIcon"> </d-page-header>
    <div>
      <div class="flex flex-col gap-2 p-4">
        <div class="text-lg font-medium text-zinc-700">Turnover</div>
        <div class="grid max-w-3xl grid-cols-4 gap-2 text-sm text-zinc-700">
          <div v-for="card in data?.turnover" :key="card.name" class="rounded-md bg-zinc-100 p-4">
            <div class="mb-2 text-xl font-medium" :class="card.value > 0 ? 'text-green-500' : 'text-red-500'">
              {{ formatNumber(card.value) }}
            </div>
            <div class="flex-1 text-zinc-500">{{ card.name }}</div>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2 p-4">
        <div class="text-lg font-medium text-zinc-700">Transaction Score</div>
        <div class="grid max-w-3xl grid-cols-4 gap-2 text-sm text-zinc-700">
          <div v-for="card in data?.score" :key="card.name" class="rounded-md bg-zinc-100 p-4">
            <div class="mb-2 text-xl font-medium">
              <template v-if="card.type === 'positive'">
                <span class="text-green-500">{{ card.value }}</span>
              </template>
              <template v-else-if="card.type === 'negative'">
                <span class="text-red-500">{{ card.value }}</span>
              </template>
              <template v-else-if="card.type === 'percentage'">
                <span class="text-zinc-500">{{ card.value }}%</span>
              </template>
              <template v-else>
                {{ card.value }}
              </template>
            </div>
            <div class="flex-1 text-zinc-500">{{ card.name }}</div>
          </div>
        </div>
      </div>
    </div>
  </d-page>
</template>
