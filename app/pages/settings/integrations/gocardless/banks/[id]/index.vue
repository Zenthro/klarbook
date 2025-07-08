<script setup lang="ts">
import { ArrowLeftIcon, PauseIcon, PlayIcon, RefreshCwIcon } from "lucide-vue-next"
import type { DBank } from "~/types/models"

definePageMeta({
  layout: "settings",
})

const search = ref("")
const reconnecting = ref(false)

const route = useRoute()
const bankId = route.params.id

const { data: bank } = await useFetch<DBank>(`/api/banks/${bankId}`)
const { data: accounts, refresh } = await useFetch(`/api/banks/${bankId}/accounts`, {})

function openModal() {
  // TODO
}

async function sync() {
  await $fetch(`/api/integrations/gocardless/banks/${bank.value?.externalId}/accounts/sync`)
  await refresh()
}

async function bankAccountEnable(account: any) {
  await $fetch(`/api/bank-accounts/${account.id}/syncing`, {
    method: "POST",
  })
  await refresh()
}

async function bankAccountDisable(account: any) {
  await $fetch(`/api/bank-accounts/${account.id}/syncing`, {
    method: "DELETE",
  })
  await refresh()
}

async function reconnectBank() {
  try {
    reconnecting.value = true
    const { link } = await $fetch(`/api/integrations/gocardless/banks/${bank.value?.externalId}/connect`, {
      method: "POST",
      body: { reconnect: true }
    })
    
    if (link) {
      window.location.href = link
    }
  } catch (error) {
    console.error("Failed to reconnect bank:", error)
  } finally {
    reconnecting.value = false
  }
}
</script>
<template>
  <d-page v-if="bank">
    <div class="absolute top-4 left-4 flex gap-2">
      <d-button :icon-left="ArrowLeftIcon" variant="secondary" to="/settings/integrations/gocardless">
        GoCardless
      </d-button>
    </div>

    <div class="mx-auto w-full max-w-xl py-16">
      <div class="flex justify-between items-center">
        <h1 class="mb-4 text-2xl text-zinc-800">{{ bank.name }}</h1>
        <d-button
          variant="secondary"
          :icon-left="RefreshCwIcon"
          :loading="reconnecting"
          @click="reconnectBank"
        >
          Reconnect
        </d-button>
      </div>
      <div class="mb-2">
        <d-input v-model="search" placeholder="Search..."></d-input>
      </div>

      <div class="mb-2 flex flex-col gap-2">
        <div
          v-for="account in accounts"
          class="flex flex-row justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5"
        >
          <div class="flex flex-col gap-1 pt-0.5">
            <div class="text-sm font-medium text-zinc-700">{{ account.name }}</div>
            <div class="text-sm text-zinc-500">{{ formatIBAN(account.iban) }}</div>
            <div v-if="account.syncing" class="text-sm font-medium text-green-700">
              Account is synchronized daily
            </div>
            <div v-else class="text-sm font-medium text-red-700">Account is ignored</div>
          </div>

          <div>
            <d-button
              v-if="account.syncing"
              variant="secondary"
              :icon-left="PauseIcon"
              @click="bankAccountDisable(account)"
            >
              Deactivate
            </d-button>
            <d-button v-else variant="secondary" :icon-left="PlayIcon" @click="bankAccountEnable(account)">
              Activate
            </d-button>
          </div>
        </div>
      </div>
    </div>
  </d-page>
</template>
