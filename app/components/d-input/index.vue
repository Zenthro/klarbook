<script setup lang="ts">
type Props = {
  modelValue: string
  type?: string
  formatter?: (value: any) => string
  color?: boolean
  placeholder?: string
}

const { type = "text", color, placeholder, ...props } = defineProps<Props>()

const input = ref<HTMLInputElement | null>(null)
const textAreaRows = ref(1)
const isFocused = ref(false)

const component = computed(() => {
  if (type === "textarea") {
    return "textarea"
  } else {
    return "input"
  }
})

const textAreaStyling = computed(() => {
  if (type !== "textarea") return ""
  return isFocused.value ? "absolute right-0 max-w-[300px] z-10" : "h-full overflow-hidden"
})

const currentColor = computed(() => {
  if (!color) return ""
  if (parseFloat(props.modelValue) > 0) {
    return "text-green-600"
  } else {
    return "text-red-600"
  }
})

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const model = ref<string>(props.modelValue)
const previousValue = ref<string>("")

watch(
  () => props.modelValue,
  (newValue) => {
    model.value = newValue
  },
)

function handleInput(e: Event) {
  model.value = (e.target as HTMLInputElement).value
  emit("update:modelValue", model.value)
}

function handleFocus() {
  isFocused.value = true
  textAreaRows.value = 4
  model.value = previousValue.value
}

const formatValue = (value: string): string => {
  if (props.formatter) {
    return props.formatter(parseFloat(value))
  }
  return value
}

function blur() {
  if (!input.value) return
  input.value.blur()
}

function handleBlur() {
  isFocused.value = false
  textAreaRows.value = 1
  if (!props.formatter) return
  if (!model.value) return
  previousValue.value = model.value
  const formattedValue = formatValue(model.value)
  model.value = formattedValue
  emit("update:modelValue", model.value)
}

onMounted(() => {
  previousValue.value = model.value
  if (!model.value) return
  if (props.formatter) {
    model.value = formatValue(model.value)
    emit("update:modelValue", model.value)
  }
})
</script>

<template>
  <div class="flex-1 text-sm break-all text-zinc-500">
    <component
      ref="input"
      :is="component"
      @focus="handleFocus"
      @input="handleInput"
      @blur="handleBlur"
      :rows="textAreaRows"
      v-bind="props"
      :value="model"
      :placeholder
      class="w-full rounded-md bg-zinc-50 px-2 py-1.5 text-sm text-zinc-900 ring-blue-600 outline-none placeholder:text-zinc-500 focus:border-transparent focus:ring-2"
      :class="[textAreaStyling, currentColor]"
      @keydown.esc.prevent.stop="blur()"
    />
  </div>
</template>
