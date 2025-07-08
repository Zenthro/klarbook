<script setup lang="ts">
import {
  ArrowUpRight,
  Banknote,
  ChartLineIcon,
  FileCheck2,
  FilesIcon,
  FileTextIcon,
  InboxIcon,
  LandmarkIcon,
  LogOut,
  Settings,
} from "lucide-vue-next"

async function logout() {
  await navigateTo("/login")
}

const { user } = useUserSession()

const organisationName = ref(user.value?.organisationName ?? "--")

function getFirstChar(value: string) {
  return Array.from(value)[0]
}
</script>

<template>
  <div class="flex h-full w-full max-w-[220px] min-w-[220px] flex-col justify-between p-2 pr-1">
    <div class="flex w-full flex-col gap-1">
      <div
        v-if="organisationName"
        class="mt-1 mb-2 flex h-8 w-full items-center gap-2 rounded-md p-2 text-sm font-medium text-zinc-700"
      >
        <d-avatar>{{ getFirstChar(organisationName) }}</d-avatar>
        <p class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {{ organisationName }}
        </p>
      </div>
      <d-sidebar-link name="Inbox" link="/inbox" :icon="InboxIcon" />
      <d-sidebar-link name="Dashboard" link="/" :icon="ChartLineIcon" />
      <d-sidebar-link name="Documents" link="/documents" :icon="FileTextIcon" />
      <d-sidebar-link name="Transactions" link="/bank-transactions" :icon="LandmarkIcon" />
      <d-sidebar-link name="Export" link="/export" :icon="ArrowUpRight" />
    </div>
    <div class="flex w-full flex-col gap-1">
      <d-sidebar-link name="Settings" link="/settings/profile" :icon="Settings" />
      <d-sidebar-link name="Log Out" @click="logout" :icon="LogOut" />
    </div>
  </div>
</template>
