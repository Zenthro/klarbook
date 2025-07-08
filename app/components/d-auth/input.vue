<script setup lang="ts">
interface Props {
  name: string
  type?: "text" | "email" | "password"
  icon?: any
  required?: boolean
  placeholder?: string
  autocomplete?: string
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  required: false,
  placeholder: "",
})

const model = defineModel<string>()
</script>

<template>
  <div class="w-full">
    <d-form-label :name>
      {{ label }}
    </d-form-label>
    <d-form-input :id="name" v-bind="props" v-model="model" />
  </div>
</template>
