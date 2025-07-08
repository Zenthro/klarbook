<script setup lang="ts">
definePageMeta({
  layout: "settings",
})

// TODO: implement
const me = ref({
  organisation: {
    name: "Acme",
  },
})

const formData = ref({ name: "" })

watchEffect(() => {
  if (me.value) {
    formData.value = { name: me.value.organisation.name }
  }
})

const hasChanges = computed(() => {
  return me.value && formData.value.name !== me.value.organisation.name
})

function resetChanges() {
  if (me.value) {
    formData.value = { name: me.value.organisation.name }
  }
}

const saveChanges = async () => {
  try {
    await $fetch("/api/organisation", {
      method: "PUT",
      body: formData.value,
    })
    // TODO: refresh()
  } catch (error: any) {
    console.error(error)
  }
}
</script>
<template>
  <d-page>
    <div class="mx-auto flex w-full max-w-xl flex-col gap-8 py-16">
      <h1 class="text-2xl text-zinc-800">Organization</h1>
      <d-settings-container>
        <d-settings-row title="Organization Name">
          <d-form-input
            name="organisation-name"
            type="text"
            placeholder="Name of Organization"
            v-model="formData.name"
          />
        </d-settings-row>
      </d-settings-container>
      <d-settings-container title="Danger Zone">
        <d-settings-row
          title="Delete Workspace"
          subtitle="Contact support@klarbook.com to delete your workspace."
        >
          <d-button variant="danger-light" disabled>Delete</d-button>
        </d-settings-row>
      </d-settings-container>
      <d-settings-save-banner @reset="resetChanges" @save="saveChanges" :show="hasChanges" />
    </div>
  </d-page>
</template>
