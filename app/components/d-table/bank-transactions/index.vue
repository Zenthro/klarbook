<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next"
import { templateRef, useInfiniteScroll } from "@vueuse/core"
import type { DDocument } from "~/types/models"

interface Props {
  bankTransactions: Array<DDocument>
}

defineProps<Props>()
const emit = defineEmits(["loadMore", "refresh"])

const el = templateRef<HTMLDivElement>("el")

const { reset } = useInfiniteScroll(
  el,
  () => {
    emit("loadMore")
  },
  {
    distance: 200,
    canLoadMore: () => true, // We handle this in the parent component
  },
)

defineExpose({
  reset,
})

async function ignore(bankTransaction: any) {
  await $fetch(`/api/documents/${bankTransaction.id}/ignore`, { method: "POST" })
  emit("refresh")
}
</script>

<template>
  <div class="flex flex-1 flex-col overflow-scroll">
    <div
      class="grid min-h-0 items-center border-b border-zinc-100 [&>*]:hover:bg-zinc-100"
      style="grid-template-columns: 32px 100px 5fr minmax(70px, 1fr) 120px"
    >
      <d-table-cell></d-table-cell>
      <d-table-cell>Date</d-table-cell>
      <d-table-cell>Description</d-table-cell>
      <d-table-cell>Documents</d-table-cell>
      <d-table-cell class="text-right">Amount</d-table-cell>
    </div>
    <div ref="el" class="w-full flex-1 overflow-auto">
      <NuxtLink
        :to="`/bank-transactions/${bankTransaction.id}`"
        v-for="bankTransaction in bankTransactions"
        :key="bankTransaction.id"
        class="group grid items-center hover:bg-zinc-50"
        style="grid-template-columns: 32px 100px 5fr minmax(70px, 1fr) 120px"
      >
        <d-table-cell class="px-0" @click.prevent="ignore(bankTransaction)">
          <d-status :status="bankTransaction.status" class="!p-0" />
        </d-table-cell>
        <d-table-cell class="flex justify-end text-right tabular-nums">
          {{ formatDate(bankTransaction.date!) }}
        </d-table-cell>
        <d-table-cell class="overflow-hidden text-ellipsis">
          {{ bankTransaction.description }}
        </d-table-cell>
        <d-table-cell class="!p-0">
          <!-- <div
            v-if="false"
            class="group flex h-full w-full gap-1 px-2 py-1.5"
            :class="
              bankTransaction.business_record_suggestions.length > 0 ? 'bg-purple-50 hover:bg-purple-100' : 'block'
            "
          >
            <NuxtLink
              v-for="record in bankTransaction.business_records"
              :to="`/business-records/${record.id}`"
              :key="record.id"
              class="rounded-md bg-zinc-100 px-1 py-0.5 text-xs text-zinc-800 group-hover:bg-zinc-200"
            >
              {{ paddNumber(record.record_id, 4) }}
            </NuxtLink>
            <NuxtLink
              v-for="record in bankTransaction.business_record_suggestions"
              :to="`/business-records/${record.id}`"
              :key="record.id"
              class="rounded-md bg-purple-100 px-1 py-0.5 text-xs text-purple-800 group-hover:bg-purple-200"
            >
              {{ paddNumber(record.record_id, 4) }}
            </NuxtLink>
          </div>
          <div v-if="false" class="hidden items-center gap-1 group-hover:flex">
            <PlusIcon class="h-4 w-4" />
            <div class="text-xs">Link document</div>
          </div> -->
        </d-table-cell>
        <d-table-cell
          class="flex justify-end tabular-nums"
          :class="bankTransaction.amount! > 0 ? '!text-green-500' : '!text-red-500'"
        >
          {{ formatNumber(bankTransaction.amount) }}
        </d-table-cell>
      </NuxtLink>
    </div>
  </div>
</template>
