<script setup lang="ts">
import type { DDocument } from "~/types/models"

interface Props {
  document?: DDocument
}

const { document } = defineProps<Props>()

const search = ref("")

const emit = defineEmits(["refresh"])

const { data, refresh } = await useFetch("/api/documents", {
  params: {
    search: search,
    type: "bank-transaction",
    limit: 40,
  },
})

const documents = computed<DDocument[]>(() => (data.value?.data as any) || [])

function highlight(text: string, search?: string) {
  if (!search) return text

  // if there are white spaces in the search term, search for both, with and without white space
  const searchWithoutSpaces = search.replace(/\s+/g, "")
  const searchPattern = `${search}|${searchWithoutSpaces}`
  const regex = new RegExp(searchPattern, "gi")

  return text.replace(regex, (match) => `<span class="bg-yellow-500 text-yellow-900">${match}</span>`)
}

async function linkDocuments(documentId: string) {
  if (!document) return alert("There isn't a document to be linked to")
  await $fetch(`/api/documents/${document.id}/links/${documentId}`, { method: "POST" })
  await refresh()
  emit("refresh")
}
</script>

<template>
  <DModal title="Bank Transactions" @close="$emit('close')" disable-actions confirm-text="Save" @confirm="false">
    <div>
      <div class="p-2.5 pb-0">
        <d-input v-model="search" placeholder="Search..."></d-input>
      </div>

      <div class="flex h-[500px] flex-col gap-1 overflow-scroll px-2.5 py-2.5">
        <!-- <pre>{{ documents }}</pre> -->
        <div
          v-for="document in documents"
          :key="document.id"
          class="flex cursor-default flex-col gap-0.5 rounded-md p-2 hover:bg-zinc-100"
          @click="linkDocuments(document.id)"
        >
          <div class="flex justify-between">
            <div class="flex items-center gap-2">
              <div><d-status class="size-5 p-0" :status="document.status"></d-status></div>
              <div class="text-sm tabular-nums">{{ formatDate(document.date) }}</div>
            </div>
            <div class="text-sm tabular-nums" :class="document.amount > 0 ? 'text-green-500' : 'text-red-500'">
              {{ document.amount }}
            </div>
          </div>
          <div>
            <div
              class="line-clamp-4 text-xs overflow-ellipsis text-zinc-500"
              v-html="highlight(document.description, $props.document?.number)"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </DModal>
</template>
