<script setup lang="ts">
type Props = {
  title: string
  subtitle?: string
}

const { title, subtitle = "" } = defineProps<Props>()
</script>
<template>
  <div class="flex w-[350px] flex-col">
    <div class="flex w-full flex-col items-center gap-2 p-6 text-center">
      <svg width="31" height="28" viewBox="0 0 31 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0.5 28V27L2.13488 26.6V1.4L0.5 1V0H12.5572V1L11.1267 1.4V13.36L23.3065 1.4L19.6281 0.96V0H28.9469V0.96L24.9414 1.4L13.0886 12.88L19.4646 10.52L29.3965 26.6L30.5 27V28H19.6689L11.1267 14.32V26.6L12.5572 27V28H0.5Z"
          fill="#0F172A"
        />
      </svg>
      <div>
        <h2 class="text-xl leading-8 font-semibold tracking-tight">{{ title }}</h2>
        <p class="text-sm text-zinc-600">{{ subtitle }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-6 rounded-md bg-white p-6 shadow">
      <slot />
    </div>

    <div class="flex flex-col gap-2 py-6">
      <slot name="footer" />
    </div>
  </div>
</template>
