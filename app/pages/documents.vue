<script setup lang="ts">
import { useDropZone, useFileDialog, useIntervalFn, useSessionStorage } from "@vueuse/core"
import { FileTextIcon, UploadIcon } from "lucide-vue-next"
import type { DDocument } from "~/types/models"

const search = useSessionStorage("documents-search", "")

const statusNames = ["All", "Open", "Matched", "Ignored", "Error"]
const statusValues = [null, "unmatched", "matched", "ignore", "error"]
const status = useSessionStorage("documents-status", null)

const directionNames = ["All", "Incoming", "Outgoing", "Neither"]
const directionValues = [null, "incoming", "outgoing", "neither"]
const direction = useSessionStorage("documents-direction", null)

const offset = useSessionStorage("documents-offset", 0)
const limit = useSessionStorage("documents-limit", 20)

const { data, refresh } = await useFetch("/api/documents", {
  params: {
    search: search,
    status: status,
    type: "beleg",
    offset: offset,
    limit: limit,
    direction: direction,
  },
})

// auto refresh
useIntervalFn(async () => {
  await refresh()
}, 2500)

const total = computed(() => data.value?.pagination.total || 0)

const documents = computed<DDocument[]>(() => (data.value?.data as any) || [])

async function onDrop(files: File[] | null) {
  if (!files?.length) return
  for (const file of files) {
    await uploadFile(file)
  }
}

function selectFile() {
  open()
}

async function uploadFile(file: File) {
  try {
    const form = new FormData()
    form.append("file", file)

    const res = await $fetch("/api/documents", {
      method: "POST",
      body: form,
    })

    console.log(res)
    await refresh()
  } catch (error) {
    console.error(error)
  }
}

const dropZoneRef = ref<HTMLDivElement>()

async function handleFiles(files: any) {
  if (!files?.length) return
  for (const file of files) {
    await uploadFile(file)
  }
}

const { open, onChange } = useFileDialog({
  accept: "application/pdf",
})

onChange(handleFiles)

function nextPage() {
  if (offset.value + limit.value > total.value) return
  offset.value += limit.value
  refresh()
}

function prevPage() {
  if (offset.value <= 0) return
  offset.value -= limit.value
  refresh()
}
</script>

<template>
  <d-page ref="dropZoneRef">
    <d-page-header name="Documents" :icon="FileTextIcon" v-model:search="search" show-search>
      <template #trailing>
        <d-button :icon-left="UploadIcon" @click="selectFile">Upload</d-button>
      </template>
    </d-page-header>
    <div class="flex w-full flex-row items-center gap-2 border-b border-zinc-100 px-2.5 py-1">
      <d-page-filter v-model:filter="status" :names="statusNames" :values="statusValues" />
      <div class="h-full w-[1px] bg-zinc-100"></div>
      <d-page-filter v-model:filter="direction" :names="directionNames" :values="directionValues" />
    </div>
    <d-dropzone @drop="onDrop">
      <d-table-business-records :documents="documents" />
      <d-pagination :total="total" :offset="offset" :limit="limit" @next="nextPage" @prev="prevPage" />
    </d-dropzone>
    <nuxt-page @refresh="refresh" />
  </d-page>
</template>
