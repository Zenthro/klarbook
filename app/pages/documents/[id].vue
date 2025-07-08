<script setup lang="ts">
import { Trash2, X, Maximize2Icon, LinkIcon, Minimize2, RefreshCcwIcon, XIcon } from "lucide-vue-next"
import { onKeyStroke } from "@vueuse/core"
import type { DDocument } from "~/types/models"

const route = useRoute()
const router = useRouter()

const emit = defineEmits(["refresh"])

const { data: document, refresh: refreshDocument } = await useFetch(`/api/documents/${route.params.id}`)
const { data: actions, refresh: refreshActions } = await useFetch(`/api/documents/${route.params.id}/actions`)

async function refresh() {
  await refreshDocument()
  await refreshActions()
}

async function refreshAll() {
  await refresh()
  emit("refresh")
}

const toolbarOptions = "#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0&view=fit"
const previewUrl = `/api/documents/${route.params.id}/download${toolbarOptions}`

function close() {
  if (linkModal.value) {
    closeLinkModal()
    return
  }
  if (isPreview.value) {
    closePreview()
    return
  }
  if (!isPreview.value) {
    navigateTo("/documents")
  }
}

const isPreview = computed(() => {
  return !!route.query.preview
})

function togglePreview() {
  console.log(isPreview.value)
  if (isPreview.value) closePreview()
  if (!isPreview.value) openPreview()
}

function openPreview() {
  router.push({ query: { ...route.query, preview: true } })
}

function closePreview() {
  const { preview, ...restQuery } = route.query
  router.push({ query: restQuery })
}

onKeyStroke("Escape", close)

const retryLoading = ref(false)

async function retry() {
  retryLoading.value = true
  try {
    await $fetch(`/api/documents/${route.params.id}/retry`, {
      method: "POST",
    })
    emit("refresh")
  } catch (error: any) {
    console.error(error)
  }
  retryLoading.value = false
}

// Link transaction
const linkModal = ref(false)

function openLinkModal() {
  linkModal.value = true
}

function closeLinkModal() {
  linkModal.value = false
}

async function linkDocuments(document: any, link: any) {
  await $fetch(`/api/documents/${document.id}/links/${link.id}`, { method: "POST" })
  await refresh()
  emit("refresh")
}

// Archive
async function confirmArchive(document: any) {
  const confirmed = confirm("Do you really want to archive this document?")
  if (!confirmed) return
  await archiveDocuments(document)
}

async function archiveDocuments(document: any) {
  await $fetch(`/api/documents/${document.id}`, {
    method: "DELETE",
  })
  emit("refresh")
  close()
}

async function unlink(document: DDocument, link: DDocument) {
  await $fetch(`/api/documents/${document.id}/links/${link.id}`, {
    method: "DELETE",
  })
  await refresh()
  emit("refresh")
}
</script>

<template>
  <d-page-pane :full="isPreview" v-if="document" @close="close">
    <div class="flex h-full">
      <div v-if="isPreview" class="flex h-full flex-1 flex-col border-r border-zinc-100">
        <d-page-header name="Preview">
          <template #trailing>
            <d-tooltip title="Minimize">
              <d-button :icon-left="Minimize2" variant="outline" @click="closePreview" />
            </d-tooltip>
          </template>
        </d-page-header>
        <div class="box-border flex flex-1 flex-col items-center justify-start gap-5 overflow-auto">
          <iframe :src="previewUrl" frameborder="0" class="h-full w-full"></iframe>
        </div>
      </div>

      <div class="h-full w-[450px]">
        <div class="flex h-12 min-h-12 flex-row items-center justify-between border-b border-b-zinc-100 px-4 py-2.5">
          <div class="flex flex-row items-center gap-2">
            <div class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 tabular-nums">
              {{ paddNumber(document.documentId, 4) }}
            </div>
            <div class="flex gap-2">
              <d-status :status="document.status" label />
            </div>
          </div>
          <div class="flex gap-1">
            <d-button :icon-left="Trash2" variant="outline" @click="confirmArchive(document)" />
            <d-button :icon-left="X" variant="outline" @click="close" />
          </div>
        </div>

        <div v-if="document.status === 'error'" class="flex items-center justify-between bg-red-50 px-4 py-2.5">
          <div class="line-clamp-1 text-sm overflow-ellipsis text-red-700">Data could not be recognized</div>
          <d-button variant="danger-light" :icon-left="RefreshCcwIcon" @click="retry" :loading="retryLoading">
            Try again
          </d-button>
        </div>

        <div class="flex flex-col gap-6 p-4">
          <div class="flex flex-col gap-2">
            <d-input-row name="Sender">
              <d-input v-model="document.senderName"></d-input>
            </d-input-row>
            <d-input-row name="Recipient">
              <d-input v-model="document.recipientName"></d-input>
            </d-input-row>
            <d-input-row name="Invoice No.">
              <d-input v-model="document.number"></d-input>
            </d-input-row>
            <d-input-row name="Invoice Date">
              <d-input v-model="document.date" type="date"></d-input>
            </d-input-row>
            <d-input-row name="Booking Note">
              <d-input v-model="document.note"></d-input>
            </d-input-row>
            <d-input-row name="Total">
              <d-input v-model="document.amount" :formatter="formatNumber" color></d-input>
            </d-input-row>
          </div>

          <div class="flex flex-col gap-2">
            <div class="text-sm font-medium text-zinc-700">Bank Transactions</div>

            <div v-if="document.links.length > 0" class="flex flex-col gap-2">
              <div
                v-for="link in document.links"
                :key="link.id"
                class="flex cursor-default items-center gap-2 rounded-md bg-zinc-100 p-1 pl-2.5"
              >
                <div class="text-sm tabular-nums">{{ formatDate(link.link.date) }}</div>
                <div class="line-clamp-1 h-[1lh] text-xs overflow-ellipsis whitespace-nowrap text-zinc-500">
                  {{ link.link.description }}
                </div>
                <div class="text-sm tabular-nums" :class="link.link.amount > 0 ? 'text-green-500' : 'text-red-500'">
                  {{ link.amount }}
                </div>
                <d-button :icon-left="XIcon" variant="secondary" @click="unlink(document, link.link)"></d-button>
              </div>
            </div>

            <!-- Actions -->
            <div v-else-if="actions?.length > 0" class="flex flex-col gap-2">
              <div
                v-for="action in actions"
                :key="action.id"
                class="flex cursor-default items-center gap-2 rounded-md bg-purple-50 p-2 hover:bg-purple-100"
                @click="linkDocuments(document, action)"
              >
                <div class="text-sm text-purple-900/90 tabular-nums">{{ formatDate(action.date) }}</div>
                <div
                  class="line-clamp-1 h-[1lh] text-xs font-medium overflow-ellipsis whitespace-nowrap text-purple-900/60"
                >
                  {{ action.description }}
                </div>
                <div></div>
                <div class="text-sm tabular-nums" :class="action.amount > 0 ? 'text-green-500' : 'text-red-500'">
                  {{ action.amount }}
                </div>
              </div>
            </div>

            <d-button variant="outline" :icon-left="LinkIcon" @click="openLinkModal">Link Transaction</d-button>
          </div>

          <div class="flex flex-col gap-2">
            <div class="text-sm font-medium text-zinc-700">Original</div>
            <div
              class="group relative h-44 w-32 overflow-hidden rounded-md bg-white ring-1 ring-zinc-200 transition-all hover:shadow-md"
              @click="togglePreview"
              :class="isPreview ? 'shadow-md' : 'hover:shadow-md'"
            >
              <iframe :src="previewUrl" frameborder="0" class="w-full"></iframe>
              <d-button
                variant="outline"
                size="XS"
                :icon-left="isPreview ? Minimize2 : Maximize2Icon"
                class="absolute! -bottom-2 left-2 opacity-0 transition-all"
                :class="isPreview ? 'bottom-2 opacity-100' : 'group-hover:bottom-2 group-hover:opacity-100'"
              >
                <template v-if="isPreview"> Minimize </template>
                <template v-else> Preview </template>
              </d-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </d-page-pane>

  <d-modal-link-transaction v-if="linkModal" :document="document" @close="linkModal = false" @refresh="refreshAll" />
</template>
