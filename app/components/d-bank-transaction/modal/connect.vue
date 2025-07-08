<script setup lang="ts">
import { useDebounce, useSessionStorage } from "@vueuse/core"

const search = useSessionStorage("bank-account-search", "")
const bankId = ref<string | null>(null)

const { data: banks } = await useFetch("/api/integrations/gocardless/banks", {
  params: {
    search: useDebounce(search, 500),
  },
})

async function connectBankAccount(id: string) {
  bankId.value = id

  const res = await $fetch(`/api/integrations/gocardless/banks/${bankId.value}/connect`, {
    method: "POST",
  })

  if (!res) return

  console.log(res.link)

  // open the link in a new tab
  window.open(res.link, "_blank")
}
</script>

<template>
  <DModal title="New Bank Account" @close="$emit('close')" confirm-text="Continue" @confirm="false">
    <div class="p-4">
      <d-input v-model="search" placeholder="Search"></d-input>

      <div class="flex h-[500px] flex-col gap-0.5 overflow-scroll py-2">
        <div
          v-for="bank in banks"
          class="flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-zinc-100"
          @click="connectBankAccount(bank.id)"
        >
          <img :src="bank.logo" alt="" class="size-5 rounded-full bg-white object-cover" />
          <div class="flex items-center gap-2">
            <div class="line-clamp-1 text-sm overflow-ellipsis text-zinc-700">{{ bank.name }}</div>
            <div class="text-xs text-nowrap text-zinc-500">{{ bank.bic }}</div>
          </div>
        </div>
      </div>
    </div>
  </DModal>
</template>
