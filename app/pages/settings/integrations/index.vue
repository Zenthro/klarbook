<script setup lang="ts">
import { NuxtLink } from "#components"
import { ArrowLeftIcon } from "lucide-vue-next"

definePageMeta({
  layout: "settings",
})

const search = ref("")

const integrations = ref([
  {
    name: "GoCardless",
    slug: "gocardless",
    description: "With GoCardless you can automatically import your bank transactions into Klarbook.",
  },
  {
    name: "Gmail",
    slug: "gmail",
    description: "With Gmail you can automatically import email attachments into Klarbook.",
  },
  {
    name: "Stripe",
    slug: "stripe",
    description: "With Stripe you can automatically import your invoices from Stripe into Klarbook.",
  },
  {
    name: "sevDesk",
    slug: "sevdesk",
    soon: true,
    description: "With sevDesk you can automatically import your sevDesk documents into Klarbook.",
  },
  // {
  //   name: "Google Workspace",
  //   slug: "google-workspace",
  //   soon: true,
  //   description:
  //     "With Google Workspace you can automatically import documents sent to you into Klarbook.",
  // },
])

const filteredIntegrations = computed(() => {
  if (!search.value) return integrations.value
  return integrations.value.filter((integration) => integration.name.toLowerCase().includes(search.value.toLowerCase()))
})
</script>
<template>
  <d-page>
    <div class="mx-auto w-full max-w-xl py-16">
      <h1 class="mb-4 text-2xl text-zinc-800">Integrations</h1>
      <div class="mb-4">
        <d-input v-model="search" placeholder="Search..."></d-input>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <component
          :is="!integration.soon ? NuxtLink : 'div'"
          v-for="integration in filteredIntegrations"
          :to="`/settings/integrations/${integration.slug}`"
          class="cursor-default rounded-md border border-zinc-200 p-4 hover:bg-zinc-100"
        >
          <div class="mb-2 flex items-center gap-2">
            <div class="font-medium text-zinc-700">{{ integration.name }}</div>
            <div v-if="integration.soon" class="rounded-md bg-zinc-900/5 px-1.5 py-0.5 text-xs text-zinc-500">Soon</div>
          </div>
          <div class="text-sm text-zinc-500">{{ integration.description }}</div>
        </component>
      </div>
    </div>
  </d-page>
</template>
