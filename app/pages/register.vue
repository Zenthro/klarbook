<script setup lang="ts">
import { useSessionStorage } from "@vueuse/core"
import { ArrowLeft, ShieldQuestion } from "lucide-vue-next"
definePageMeta({
  layout: "auth",
})

// const supabase = useSupabaseClient()
const name = ref("")
const email = useSessionStorage("user-email", "")
const password = ref("")
const company = ref("")
const loading = ref(false)
const errorMessage = ref("")

async function signUp() {
  try {
    loading.value = true

    // Call the server endpoint
    await $fetch("/api/register", {
      method: "POST",
      body: {
        email: email.value,
        password: password.value,
        name: name.value,
        organisationName: company.value,
      },
    })
    await navigateTo("/login")
  } catch (error: any) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

function handleError(error: any) {
  console.error(error)

  if (error?.data?.message?.includes("User already registered")) {
    errorMessage.value = "This email address is already registered"
  } else if (error?.data?.message?.includes("Password")) {
    errorMessage.value = "The password does not meet the requirements"
  } else {
    errorMessage.value = "An error occurred"
  }
}
</script>

<template>
  <form @submit.prevent="signUp">
    <d-auth-container title="Welcome to Klarbook">
      <div class="flex flex-col gap-3">
        <d-auth-input
          label="Email Address"
          name="email"
          type="email"
          v-model="email"
          placeholder="john@example.com"
          autocomplete="email"
          required
          disabled
        />
        <d-auth-input
          label="Your Name"
          name="name"
          type="text"
          v-model="name"
          placeholder="John Doe"
          autocomplete="name"
          required
          disabled
        />
        <d-auth-input
          label="Password"
          name="password"
          type="password"
          v-model="password"
          placeholder="••••••••"
          autocomplete="current-password"
          required
        />
        <d-auth-input
          label="Your Company Name"
          name="organization"
          type="text"
          v-model="company"
          placeholder="Acme GmbH"
          autocomplete="organization"
          required
          disabled
        />
        <d-button variant="primary" type="submit" class="w-full justify-center" size="LG" :loading="loading">
          Register
        </d-button>
      </div>

      <template #footer>
        <d-button to="/login" size="MD" variant="outline" :icon-left="ArrowLeft">Back</d-button>
      </template>
    </d-auth-container>

    <!-- Show error message if exists -->
    <div v-if="errorMessage" class="text-sm text-red-500">
      {{ errorMessage }}
    </div>
  </form>
</template>
