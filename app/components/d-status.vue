<script setup lang="ts">
import matchedIcon from "~/assets/status/d-matched.svg"
import unmatchedIcon from "~/assets/status/d-unmatched.svg"
import ignoreIcon from "assets/status/d-ignore.svg"
import loadingIcon from "~/assets/status/d-loading.svg"
import errorIcon from "~/assets/status/d-error.svg"

interface Props {
  status: "matched" | "unmatched" | "ignore" | "loading" | "error"
  label?: boolean
}

const { status, label = false } = defineProps<Props>()

const statusIcons = {
  matched: matchedIcon,
  unmatched: unmatchedIcon,
  ignore: ignoreIcon,
  loading: loadingIcon,
  error: errorIcon,
}
</script>

<template>
  <div class="flex items-center gap-2 p-1">
    <d-tooltip :title="statusText[status]">
      <img
        :src="statusIcons[status]"
        :alt="status"
        class="w-full max-w-4 min-w-4"
        :class="status === 'loading' ? 'animate-spin' : ''"
      />
    </d-tooltip>
    <div v-if="label" class="text-sm font-medium text-zinc-700">
      {{ statusText[status] }}
    </div>
  </div>
</template>
