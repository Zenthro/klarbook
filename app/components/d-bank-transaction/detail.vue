<script setup lang="ts">
import { Trash2, Circle, XIcon, CircleSlash } from "lucide-vue-next"
import type { DDocument } from "~/types/models"

interface Props {
  id: string
}

const { id } = defineProps<Props>()
const emit = defineEmits(["refresh"])

const { data: document, refresh: refreshDocument } = await useFetch<DDocument>(`/api/documents/${id}`)

function close() {
  navigateTo("/bank-transactions")
}

async function ignoreBankTransaction(id: string) {
  await $fetch(`/api/documents/${id}/ignore`, { method: "POST" })
  emit("refresh")
}

async function unlink(document: DDocument, link: DDocument) {
  await $fetch(`/api/documents/${document.id}/links/${link.id}`, {
    method: "DELETE",
  })
  await refreshDocument()
  emit("refresh")
}
</script>

<template>
  <div v-if="document" class="flex h-full flex-col">
    <div class="flex h-12 flex-row items-center justify-between border-b border-zinc-100 px-4 py-2.5">
      <div class="flex flex-row items-center gap-2">
        <div class="text-sm font-semibold text-zinc-700">
          {{ formatDate(document.date) }}
        </div>
      </div>
      <div class="flex gap-1">
        <d-button variant="outline" :icon-left="Trash2" />
        <d-button variant="outline" :icon-left="XIcon" @click="close" />
      </div>
    </div>

    <div class="flex justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
      <d-status :status="document.status" label />
      <d-button
        v-if="document.status === 'unmatched'"
        variant="outline"
        @click="ignoreBankTransaction(document.id)"
        :icon-left="CircleSlash"
      >
        Ignore
      </d-button>
      <d-button
        v-else-if="document.status === 'ignore'"
        variant="outline"
        @click="ignoreBankTransaction(document.id)"
        :icon-left="Circle"
      >
        Mark as open
      </d-button>
    </div>

    <div class="flex h-full w-full flex-1 flex-col gap-6 p-4">
      <div class="flex flex-col gap-2">
        <d-input-row name="Description">
          <textarea
            v-model="document.description"
            class="field-sizing-content h-fit max-h-[9em] resize-none overflow-scroll rounded-md bg-zinc-50 p-1 px-2 py-1.5 text-sm text-zinc-900 ring-blue-600 outline-none placeholder:text-zinc-500 focus:border-transparent focus:ring-2"
          ></textarea>
        </d-input-row>
        <d-input-row v-if="document.amount" name="Total">
          <d-input v-model="document.amount" :formatter="formatNumber" color></d-input>
        </d-input-row>
      </div>

      <div class="flex flex-col gap-2">
        <div class="text-sm font-medium text-zinc-700">Bank Transactions</div>

        <div v-if="document.references.length > 0" class="flex flex-col gap-2">
          <div
            v-for="link in document.references"
            :key="link.id"
            class="flex cursor-default items-center justify-between gap-2 rounded-md bg-zinc-100 p-1 pl-2.5"
          >
            <NuxtLink
              :to="`/documents/${link.document.id}`"
              class="rounded-md bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-700 tabular-nums"
            >
              {{ paddNumber(link.document.documentId, 4) }}
            </NuxtLink>
            <div class="text-zinc-7s00 text-xs font-medium tabular-nums">
              {{ formatDate(link.document.date) }}
            </div>
            <div class="line-clamp-1 h-[1lh] flex-1 text-xs overflow-ellipsis whitespace-nowrap text-zinc-500">
              {{ link.document.senderName }} - {{ link.document.note }}
            </div>
            <div class="text-sm tabular-nums" :class="link.document.amount > 0 ? 'text-green-500' : 'text-red-500'">
              {{ formatNumber(link.document.amount) }}
            </div>
            <d-button :icon-left="XIcon" variant="secondary" @click="unlink(link.document, document)"></d-button>
          </div>
        </div>
      </div>

      <!-- <div class="flex flex-wrap gap-2">
          <d-button :icon-left="LinkIcon">Link document</d-button>
          <d-button variant="secondary" :icon-left="UploadCloudIcon" @click="open"> Upload </d-button>
        </div> -->
    </div>
  </div>
</template>
