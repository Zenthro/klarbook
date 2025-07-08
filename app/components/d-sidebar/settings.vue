<script setup lang="ts">
import { UserCircle2, Building2, ChevronLeft, Grid2X2PlusIcon } from "lucide-vue-next"
</script>

<template>
  <div class="flex h-full w-full max-w-[220px] min-w-[220px] flex-col gap-7 p-2 pr-1">
    <d-sidebar-link name="Back" link="/bank-transactions" :icon="ChevronLeft" />
    <div class="flex w-full flex-col gap-1">
      <p class="px-2 pb-1 text-xs font-medium text-zinc-500 uppercase">User Account</p>
      <d-sidebar-link name="Profile" link="/settings/profile" :icon="UserCircle2" />
    </div>
    <div class="flex w-full flex-col gap-1">
      <p class="px-2 pb-1 text-xs font-medium text-zinc-500 uppercase">Administration</p>
      <d-sidebar-link name="Organization" link="/settings/organisation" :icon="Building2" />
      <d-sidebar-link name="Integrations" link="/settings/integrations" :icon="Grid2X2PlusIcon" />
    </div>
  </div>
</template>
