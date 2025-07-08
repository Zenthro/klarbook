<script setup lang="ts">
import { useIntervalFn, useSessionStorage } from "@vueuse/core"
import { LandmarkIcon } from "lucide-vue-next"

const tableRef = ref(null)

const search = useSessionStorage("bank-transactions-search", "")

const statusNames = ["All", "Open", "Matched", "Ignored", "Error"]
const statusValues = [null, "unmatched", "matched", "ignore", "error"]
const status = useSessionStorage("bank-transactions-status", null)

const offset = useSessionStorage("bank-transactions-offset", 0)
const limit = useSessionStorage("bank-transactions-limit", 20)

const { data, refresh } = await useFetch("/api/documents", {
  params: {
    search: search,
    status: status,
    type: "bank-transaction",
    offset: offset,
    limit: limit,
  },
})

const total = computed(() => data.value?.pagination.total || 0)

const syncing = ref(false)

watch([status, search], () => {
  offset.value = 0
})

async function sync() {
  syncing.value = true

  try {
    await $fetch("/api/integrations/gocardless/transactions/sync", {
      method: "POST",
    })
    // await refresh()
  } catch (error) {
    console.error(error)
  }

  syncing.value = false
}

function nextPage() {
  if (offset.value + limit.value > total.value) return
  offset.value += limit.value
}

function prevPage() {
  if (offset.value <= 0) return
  offset.value -= limit.value
}

// auto refresh
useIntervalFn(async () => {
  await refresh()
}, 2500)
</script>

<template>
  <d-page>
    <d-page-header name="Transactions" :icon="LandmarkIcon" v-model:search="search" show-search>
      <template #trailing>
        <div class="flex gap-2">
          <d-button variant="secondary" @click="sync">Synchronize</d-button>
        </div>
      </template>
    </d-page-header>
    <div class="flex w-full flex-row items-center gap-2 border-b border-zinc-100 px-2.5 py-1">
      <d-page-filter v-model:filter="status" :names="statusNames" :values="statusValues" />
    </div>
    <div class="relative flex h-full flex-col overflow-auto rounded-md">
      <d-table-bank-transactions ref="tableRef" :bank-transactions="data?.data || []" @refresh="refresh" />
      <d-pagination :total="total" :offset="offset" :limit="limit" @next="nextPage" @prev="prevPage" />
    </div>

    <nuxt-page />
  </d-page>
</template>
