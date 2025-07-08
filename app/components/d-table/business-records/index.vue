<script setup lang="ts">
import { templateRef, useInfiniteScroll } from "@vueuse/core"
import type { DDocument } from "~/types/models"

interface Props {
  documents: Array<DDocument>
}

const route = useRoute()
const emit = defineEmits(["loadMore"])
const container = templateRef<HTMLDivElement>("container")

const selected = computed(() => route.params.id ?? null)

defineProps<Props>()

const { reset } = useInfiniteScroll(
  container,
  function () {
    emit("loadMore")
  },
  {
    distance: 200,
    canLoadMore: () => true, // We handle this in the parent component
  },
)

defineExpose({ reset })
</script>

<template>
  <div class="flex flex-1 flex-col overflow-scroll">
    <div
      class="grid min-h-0 grid-cols-[32px_140px_1fr_250px_140px_140px] items-center border-b border-zinc-100 [&>*]:hover:bg-zinc-100"
    >
      <d-table-cell class="px-0" />
      <d-table-cell>Receipt No.</d-table-cell>
      <d-table-cell>Company</d-table-cell>
      <d-table-cell>Invoice Number</d-table-cell>
      <d-table-cell>Date</d-table-cell>
      <d-table-cell>Amount</d-table-cell>
    </div>
    <div ref="container" class="w-full flex-1 overflow-auto">
      <NuxtLink
        :to="`/documents/${document.id}`"
        v-for="document in documents"
        :key="document.id"
        class="hover:bg-gray-alpha-100 grid grid-cols-[32px_140px_1fr_250px_140px_140px] items-center"
        :class="[
          document.id !== selected && document.status === 'error' ? 'bg-red-alpha-100 hover:bg-red-alpha-200' : '',
          document.id !== selected && document.status !== 'error' ? 'hover:bg-gray-alpha-100 bg-transparent' : '',
          document.id === selected && document.status == 'error' ? 'bg-red-alpha-200 hover:bg-red-alpha-300' : '',
          document.id === selected && document.status !== 'error' ? 'bg-gray-alpha-200 hover:bg-gray-alpha-300' : '',
        ]"
      >
        <template v-if="document.status === 'loading'">
          <d-table-cell class="px-0">
            <d-status :status="document.status" class="!p-0" />
          </d-table-cell>
          <d-table-cell>
            <div class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 tabular-nums">
              {{ paddNumber(document.documentId, 4) }}
            </div>
          </d-table-cell>
          <d-table-cell>
            <div class="flex animate-pulse items-center gap-2">
              <div class="size-4 rounded-full bg-zinc-200"></div>
              <div class="h-1.5 w-16 rounded-md bg-zinc-200"></div>
            </div>
          </d-table-cell>
          <d-table-cell>
            <div class="flex animate-pulse items-center gap-2">
              <div class="h-1.5 w-16 rounded-md bg-zinc-200"></div>
            </div>
          </d-table-cell>
          <d-table-cell>
            <div class="flex animate-pulse items-center gap-2">
              <div class="h-1.5 w-16 rounded-md bg-zinc-200"></div>
            </div>
          </d-table-cell>
          <d-table-cell class="flex justify-end">
            <div class="flex animate-pulse items-center gap-2">
              <div class="h-1.5 w-10 rounded-md bg-zinc-200"></div>
            </div>
          </d-table-cell>
        </template>
        <template v-else-if="document.status === 'error'">
          <d-table-cell class="px-0">
            <d-status :status="document.status" class="!p-0" />
          </d-table-cell>
          <d-table-cell>
            <div class="bg-red-alpha-300 rounded-md px-1.5 py-0.5 text-xs font-medium text-red-700 tabular-nums">
              {{ paddNumber(document.documentId, 4) }}
            </div>
          </d-table-cell>
          <div class="col-span-4 flex h-full items-center rounded-md px-2.5">
            <div class="text-sm text-red-700">Document could not be processed</div>
          </div>
        </template>
        <template v-else>
          <d-table-cell class="px-0">
            <d-status :status="document.status" class="!p-0" />
          </d-table-cell>
          <d-table-cell>
            <div class="rounded-md bg-zinc-950/5 px-1.5 py-0.5 text-xs font-medium text-zinc-700 tabular-nums">
              {{ paddNumber(document.documentId, 4) }}
            </div>
          </d-table-cell>
          <d-table-cell>{{ document.senderName }} </d-table-cell>
          <d-table-cell>{{ document.number }} </d-table-cell>
          <d-table-cell>
            <div class="tabular-nums">{{ formatDate(document.date) }}</div>
          </d-table-cell>
          <d-table-cell class="flex justify-end">
            <d-amount v-if="document.amount" :number="document.amount as any"></d-amount>
          </d-table-cell>
        </template>
      </NuxtLink>
    </div>
  </div>
</template>
