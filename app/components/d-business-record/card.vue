<script setup lang="ts">
import { onKeyStroke, useElementHover } from "@vueuse/core"
import { Unlink } from "lucide-vue-next"

interface Props {
  record: any
  showUnlink?: boolean
}

const emits = defineEmits(["unlink"])

const { record, showUnlink = false } = defineProps<Props>()

const item = useTemplateRef<HTMLDivElement>("item")

const isHovered = useElementHover(item)
</script>

<template>
  <div :to="showUnlink ? `/business-records/${record.id}` : ''" :key="record.id" class="relative flex rounded-md">
    <NuxtLink class="flex-1 p-2" ref="item">
      <div class="flex justify-between">
        <div class="font-bold text-zinc-700">
          {{ record.sender_name }}
        </div>
        <div class="font-medium text-zinc-500">
          {{ formatDate(record.date) }}
        </div>
      </div>
      <div class="flex justify-between">
        <div class="font-medium text-zinc-500">
          {{ record.note }}
        </div>
        <div class="font-medium text-red-700">
          {{ formatNumber(record.amount! * -1) }}
        </div>
      </div>
    </NuxtLink>
    <div v-if="showUnlink" class="flex items-center p-2">
      <d-tooltip title="Remove link">
        <d-button @click="$emit('unlink')" variant="outline" :icon-left="Unlink" />
      </d-tooltip>
    </div>
    <div
      v-show="isHovered"
      class="absolute top-1/2 -left-[512px] w-[500px] -translate-y-1/2 overflow-clip rounded-lg border-2 border-zinc-200 bg-white shadow"
    >
      <d-business-record-preview :business-record="record" />
    </div>
  </div>
</template>
