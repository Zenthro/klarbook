<!--suppress HtmlUnknownTarget -->
<script setup lang="ts">
interface Props {
  name: string
  link?: string
  icon?: any
}

const props = defineProps<Props>()

const route = useRoute()

const activeRoute = computed(() => {
  if (props.link === "/") return props.link === route.path
  return route.path.startsWith(props.link!)
})
</script>

<template>
  <nuxt-link
    :to="props.link"
    class="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm font-medium text-zinc-500 transition-all"
    :class="activeRoute ? 'bg-white text-zinc-800 shadow ring ring-zinc-200' : 'active:inset-shadow hover:bg-zinc-200'"
  >
    <component :is="props.icon" class="size-4" />
    {{ props.name }}
  </nuxt-link>
</template>
