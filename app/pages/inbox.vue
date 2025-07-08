<script setup lang="ts">
import { CircleSlashIcon, ClockFadingIcon, InboxIcon, LinkIcon, Trash2Icon } from "lucide-vue-next"
import { formatDistance } from "date-fns"
import { useSessionStorage } from "@vueuse/core"

const directionNames = ["All", "Incoming", "Outgoing", "Neither"]
const directionValues = [null, "incoming", "outgoing", "neither"]
const direction = useSessionStorage("inbox-direction", null)

const { data: data, refresh: refreshDocument } = await useFetch("/api/inbox", {
  params: {
    direction: direction,
  },
})
const document = computed(() => {
  if (!data.value) return
  return data.value.document
})
const duplicate = computed(() => data.value?.duplicate)

const documentId = computed(() => document.value?.id!)

const { data: actions, refresh: refreshActions } = await useFetch(() => `/api/documents/${documentId.value}/actions`)

async function refresh() {
  await refreshDocument()
  await nextTick()
  await refreshActions()
}

const previewUrl = computed(() => `/api/files/${documentId.value}/preview`)

function highlight(text: string) {
  try {
    const terms = [
      document.value?.number,
      ...document.value?.senderName?.split(" "),
      document.value?.amount + "USD",
      document.value?.amount,
    ]

    const regex = new RegExp(terms.join("|"), "gi")

    return text.replace(
      regex,
      (match) => `<span class="bg-yellow-200 text-yellow-800 font-medium px-0.5 rounded">${match}</span>`,
    )
  } catch {
    return text
  }
}

async function ignore(bankTransaction: any) {
  await $fetch(`/api/documents/${bankTransaction.id}/ignore`, { method: "POST" })
  await refresh()
}

// onKeyStroke("i", async (e) => {
//   await ignore(document.value)
// })

const linkModal = ref(false)

function openLinkModal() {
  linkModal.value = true
}

async function linkDocuments(documentId: string) {
  if (!document) return alert("There isn't a document to be linked to")
  await $fetch(`/api/documents/${document.value!.id}/links/${documentId}`, { method: "POST" })
  await refresh()
}

function isntMe(document: any) {
  return document.recipientName !== data.value?.organisation?.name
}

function confirmArchive(document: any) {
  const confirmed = confirm("Do you really want to archive this document?")
  if (confirmed) {
    archiveDocuments(document)
  }
}

async function archiveDocuments(document: any) {
  await $fetch(`/api/documents/${document.id}`, {
    method: "DELETE",
  })
  await refresh()
}

const note = computed({
  get() {
    if (!document.value) return ""
    return document.value.note
  },
  async set(value: string) {
    if (!document.value) return

    document.value.note = value

    await $fetch(`/api/documents/${documentId.value}`, {
      method: "PATCH",
      body: { note: value },
    })
  },
})

const amount = computed({
  get() {
    if (!document.value) return "0.00"
    return document.value.amount
  },
  async set(value: number) {
    if (!document.value) return

    document.value.amount = value

    await $fetch(`/api/documents/${documentId.value}`, {
      method: "PATCH",
      body: { amount: value },
    })
  },
})

const recipientName = computed({
  get() {
    if (!document.value) return ""
    return document.value.recipientName
  },
  async set(value: string) {
    if (!document.value) return

    document.value.recipientName = value

    await $fetch(`/api/documents/${documentId.value}`, {
      method: "PATCH",
      body: { recipientName: value },
    })
  },
})

const { user } = useUserSession()

const organisationName = ref(user.value?.organisationName ?? "--")

async function defaultRecipientName() {
  recipientName.value = organisationName.value
  await refresh()
}

async function later(document: any) {
  await $fetch(`/api/documents/${document.id}/later`, { method: "POST" })
  await refresh()
}
</script>

<template>
  <d-page>
    <d-page-header name="Inbox" :icon="InboxIcon">
      <d-page-filter v-model:filter="direction" :names="directionNames" :values="directionValues" />

      <template #trailing>
        <div class="flex gap-2">
          <d-button variant="secondary" :icon-left="ClockFadingIcon" @click="later(document)"> Later </d-button>
          <d-button variant="danger-light" :icon-left="Trash2Icon" @click="confirmArchive(document)">
            Archive
          </d-button>
          <d-button variant="secondary" :icon-left="CircleSlashIcon" @click="ignore(document)">Ignore</d-button>
        </div>
      </template>
    </d-page-header>
    <div v-if="document" class="grid h-full grid-cols-2 flex-row gap-2">
      <div class="flex h-full overflow-y-scroll border-r border-zinc-100 p-4">
        <div class="mx-auto aspect-[1/1.414] h-full min-h-[800px] overflow-hidden rounded shadow">
          <img :src="previewUrl" alt="" class="mx-auto h-full object-contain" />
          <!-- <embed :src="previewUrl" type="application/pdf" class="mx-auto h-full w-full" /> -->
        </div>
      </div>
      <div class="flex flex-col gap-4 overflow-hidden p-4">
        <div class="flex flex-row items-center gap-2">
          <div class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 tabular-nums">
            {{ paddNumber(document.documentId, 4) }}
          </div>
          <div class="flex gap-2">
            <d-status :status="document.status" label />
          </div>
        </div>
        <div class="w-full">
          <div class="flex w-full flex-col gap-2">
            <d-input-row name="Sender">
              <d-input v-model="document.senderName!"></d-input>
            </d-input-row>
            <d-input-row name="Recipient">
              <div class="flex !flex-row gap-2">
                <div class="flex-1 rounded" :class="[isntMe(document) ? 'outline-2 outline-red-500' : '']">
                  <d-input v-model="recipientName"></d-input>
                </div>
                <d-button variant="secondary" @click="defaultRecipientName()">
                  Set to <span>{{ organisationName }}</span>
                </d-button>
              </div>
            </d-input-row>
            <d-input-row name="Invoice No.">
              <d-input v-model="document.number!"></d-input>
            </d-input-row>
            <d-input-row name="Invoice Date">
              <d-input v-model="document.date!" type="date"></d-input>
            </d-input-row>
            <d-input-row name="Booking Note">
              <d-input v-model="note"></d-input>
            </d-input-row>
            <d-input-row name="Total">
              <d-input v-model="amount" color></d-input>
            </d-input-row>
          </div>
        </div>
        <div v-if="duplicate" class="rounded bg-orange-100 p-4">
          <div class="text-sm text-orange-800">
            We found a duplicate

            <NuxtLink :to="`/documents/${duplicate.id}`">
              document
              <div
                class="inline-block rounded-md bg-orange-200 px-1.5 py-0.5 text-xs font-medium text-orange-700 tabular-nums"
              >
                {{ paddNumber(duplicate.documentId, 4) }}
              </div>
            </NuxtLink>
            with the same number
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium text-zinc-700">Bank Transactions</div>
          <div class="flex flex-col gap-2">
            <div
              v-for="action in actions"
              :key="action.id"
              class="flex cursor-default flex-col gap-0.5 rounded-md border border-zinc-100 p-2 hover:bg-zinc-100"
              @click="linkDocuments(action.id)"
            >
              <div class="flex justify-between">
                <div class="flex items-center gap-2">
                  <div><d-status class="size-5 p-0" :status="action.status"></d-status></div>
                  <div class="text-sm tabular-nums">{{ formatDate(action.date) }}</div>
                  <div class="text-sm text-orange-600">
                    {{ formatDistance(document.date, action.date) }}
                  </div>
                </div>

                <div
                  class="rounded px-1.5 py-0.5"
                  :class="[
                    Math.abs(document.amount) === Math.abs(action.amount)
                      ? 'bg-green-100 text-green-700 outline-2 outline-green-500'
                      : '',
                  ]"
                >
                  <div class="text-sm tabular-nums">
                    {{ formatNumber(action.amount) }}
                  </div>
                </div>
              </div>
              <div>
                <div class="text-xs overflow-ellipsis text-zinc-500" v-html="highlight(action.description)"></div>
              </div>
            </div>
          </div>
          <div>
            <d-button variant="outline" :icon-left="LinkIcon" @click="openLinkModal">Link Transaction</d-button>
          </div>
        </div>
      </div>
    </div>

    <d-modal-link-transaction v-if="linkModal" :document="document" @close="linkModal = false" @refresh="refresh" />
  </d-page>
</template>
