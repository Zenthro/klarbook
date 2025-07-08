<script setup lang="ts">
definePageMeta({
  layout: "settings",
})

const { data: me, refresh } = useFetch("/api/me")

const formData = ref({ name: "" })

watchEffect(() => {
  if (me.value) {
    formData.value = { name: me.value.name }
  }
})

const hasChanges = computed(() => {
  return me.value && formData.value.name !== me.value.name
})

function resetChanges() {
  if (me.value) {
    formData.value = { name: me.value.name } // Reset to original name
  }
}

const saveChanges = async () => {
  try {
    await $fetch("/api/me", {
      method: "PUT",
      body: formData.value,
    })
    refresh()
  } catch (error: any) {
    console.error(error)
  }
}
</script>
<template>
  <d-page>
    <div class="mx-auto flex w-full max-w-xl flex-col gap-8 py-16">
      <h1 class="text-2xl text-zinc-800">Profile</h1>
      <p>This page is under development.</p>
      <d-settings-container v-if="me && formData">
        <d-settings-row
          title="Email Address"
          subtitle="Contact support@klarbook.com to change your email address."
        >
          <d-form-input name="email" type="email" v-model="me.email" disabled />
        </d-settings-row>
        <d-separator />
        <d-settings-row title="Name" subtitle="Your full name">
          <d-form-input name="name" type="text" placeholder="Your full name" v-model="formData.name" />
        </d-settings-row>
      </d-settings-container>
      <d-settings-save-banner @reset="resetChanges" @save="saveChanges" :show="hasChanges" />
    </div>
  </d-page>
</template>
