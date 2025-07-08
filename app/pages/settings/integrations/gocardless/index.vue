<script setup lang="ts">
import { ArrowLeftIcon } from "lucide-vue-next"

definePageMeta({
  layout: "settings",
})

const search = ref("")

const { data: banks } = await useFetch("/api/banks", {})

const connectModal = ref(false)

function openModal() {
  connectModal.value = true
}
</script>
<template>
  <d-page>
    <div class="absolute top-4 left-4 flex gap-2">
      <d-button :icon-left="ArrowLeftIcon" variant="secondary" to="/settings/integrations">Integrations</d-button>
    </div>

    <div class="mx-auto w-full max-w-xl py-16">
      <h1 class="mb-4 text-2xl text-zinc-800">GoCardless</h1>
      <div class="mb-2">
        <d-input v-model="search" placeholder="Search..."></d-input>
      </div>

      <div class="mb-2 flex flex-col gap-2">
        <NuxtLink
          v-for="bank in banks"
          :to="`/settings/integrations/gocardless/banks/${bank.id}`"
          class="flex gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 hover:bg-zinc-100"
        >
          <div class="text-sm text-zinc-700">{{ bank.name }}</div>
          <div class="text-sm text-zinc-500">{{ bank.bic }}</div>
        </NuxtLink>
      </div>

      <d-button variant="primary" @click="openModal">Link new bank account</d-button>

      <d-bank-transaction-modal-connect v-if="connectModal" @close="connectModal = false" />
    </div>
  </d-page>
</template>
