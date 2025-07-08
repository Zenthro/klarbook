<script setup lang="ts">
import { XIcon } from "lucide-vue-next"
import { onClickOutside, onKeyDown } from "@vueuse/core"

interface Props {
  title: string
  cancelText?: string
  confirmText?: string
  disableActions?: boolean
}

const { title, cancelText = "Cancel", confirmText = "Save", disableActions = false } = defineProps<Props>()

const emit = defineEmits(["close", "confirm"])

const dialog = ref<HTMLElement | null>(null)

function close() {
  emit("close")
}

function confirm() {
  emit("confirm")
}

onClickOutside(dialog, () => emit("close"))
onKeyDown("Escape", () => emit("close"))
</script>

<template>
  <Teleport to="body">
    <div>
      <div class="fixed inset-0 z-50 bg-black/10"></div>
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <div class="max-h-[90vh] w-full max-w-md">
            <div ref="dialog" class="relative rounded-md bg-white shadow">
              <div class="flex items-center justify-between rounded-t border-b border-zinc-200 px-4 py-2.5">
                <h3 class="text-base font-medium text-zinc-900">{{ title }}</h3>
                <DButton :icon-left="XIcon" variant="secondary" @click="close"></DButton>
              </div>
              <div class="items-start space-y-6 overflow-auto text-left">
                <slot></slot>
              </div>
              <div v-if="disableActions" class="flex justify-end space-x-2 rounded-b border-t border-zinc-200 p-4">
                <DButton variant="secondary" @click="close">{{ cancelText }}</DButton>
                <DButton variant="primary" @click="confirm">{{ confirmText }}</DButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
